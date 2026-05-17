import * as tradeRepo from "@/repositories/tradeRepository";
import * as matchRepo from "@/repositories/matchRepository";
import * as scheduleRepo from "@/repositories/scheduleRepository";
import * as swapPostRepo from "@/repositories/swapPostRepository";
import * as userRepo from "@/repositories/userRepository";
import { filterByHardConstraints } from "./matchValidator";
import { scoreSingleMatch } from "./matchScorer";
import { checkHardConstraints } from "./hardConstraints";
import type { ScoreBreakdown } from "./softScoring";
import { scoreWithSignalsOrFallbackSchedule } from "./signalScoring";
import { buildViewerSignals, viewerHasComparableSignals, type ViewerSignals } from "./viewerSignals";
import { prisma } from "@/lib/prisma";
import type { MatchResult } from "@/types/match";
import { swapPostSelect } from "@/repositories/swapPostRepository";
import { matchCacheNeedsRecompute } from "./matchCacheLegacy";
import type { PostLike } from "./softScoring";
import type { WantType } from "@/types/enums";
import { withTimeout, TimeoutError } from "@/lib/withTimeout";
import { MATCHES_FEED_MIN_MATCH_PERCENT } from "./matchThresholds";

const MAX_MATCHES_TO_SAVE = 10;

type SwapPostWithMatching = NonNullable<Awaited<ReturnType<typeof swapPostRepo.findSwapPostByIdWithMatchingDetails>>>;

function toPostLikeForScoring(post: SwapPostWithMatching): PostLike {
  return {
    wantType: post.wantType as WantType,
    wantDestinations: [...(post.wantDestinations ?? [])],
    wantExclude: [...(post.wantExclude ?? [])],
    wantMinLayover: post.wantMinLayover ?? null,
    offeredTrips: post.offeredTrips.map((t) => ({
      departureDate: t.departureDate,
      destination: t.destination,
      creditHours: t.creditHours,
      blockHours: t.blockHours ?? null,
      hasLayover: t.hasLayover,
      layoverHours: t.layoverHours,
      tripType: t.tripType as PostLike["offeredTrips"][number]["tripType"],
      scheduleTrip: t.scheduleTrip
        ? {
            legs: t.scheduleTrip.legs.map((leg) => ({
              departureAirport: leg.departureAirport,
              arrivalAirport: leg.arrivalAirport,
            })),
          }
        : null,
    })),
    wtfDays: [...(post.wtfDays ?? [])],
    quickTripType: (post.quickTripType ?? null) as PostLike["quickTripType"],
    quickDestinations: post.quickDestinations ?? undefined,
    quickDate: post.quickDate ?? null,
    quickLayoverHours: post.quickLayoverHours ?? null,
    advancedBlockHours: post.advancedBlockHours ?? null,
  };
}

export async function findMatchesForTrade(tradeId: string): Promise<MatchResult[]> {
  const trade = await tradeRepo.findTradeById(tradeId);
  if (!trade || trade.status !== "OPEN" || !trade.destination || !trade.departureDate) return [];

  const candidates = await tradeRepo.findCandidateTradesForMatching(
    trade.userId,
    trade.user.airlineId,
    trade.user.baseId
  );

  type TradeWithRequired = typeof trade & { destination: string; departureDate: Date };
  const tradeForValidation = toValidationTrade(trade as TradeWithRequired);
  const candidateValidation = filterByHardConstraints(
    tradeForValidation,
    candidates.map((c) => toValidationTrade(c as TradeWithRequired))
  );

  const validCandidates = candidates.filter((_, i) => candidateValidation[i].rejectionReasons.length === 0);
  const tradeForScoring = toScoringTrade(trade as TradeWithRequired);
  const scored = validCandidates.map((candidate) => ({
    candidate,
    score: scoreSingleMatch(tradeForScoring, toScoringTrade(candidate as TradeWithRequired)),
  }));

  const ranked = scored.sort((a, b) => b.score - a.score).slice(0, MAX_MATCHES_TO_SAVE);

  for (const { candidate, score } of ranked) {
    await matchRepo.createOrRefreshPendingMatch({
      tradeId: trade.id,
      offererId: trade.userId,
      receiverId: candidate.userId,
      matchScore: score,
    });
  }

  return ranked.map((r) => ({
    tradeId,
    matchedTradeId: r.candidate.id,
    score: r.score,
    isValid: true,
    rejectionReasons: [] as string[],
  }));
}

function toValidationTrade(t: { destination: string; aircraftTypeCode: string | null; user: { baseId: string; rankId: string; qualifications: { aircraftType: { code: string } }[] } }) {
  return {
    destination: t.destination,
    aircraftTypeCode: t.aircraftTypeCode,
    user: {
      baseId: t.user.baseId,
      rankId: t.user.rankId,
      qualifications: t.user.qualifications,
    },
  };
}

function toScoringTrade(t: {
  destination: string;
  departureDate: Date;
  creditHours: number | null;
  layoverDuration: number | null;
  desiredDestinations: string[];
  wtfDays: number[];
  preferMinCredit: number | null;
  preferMaxCredit: number | null;
}) {
  return {
    destination: t.destination,
    departureDate: t.departureDate,
    creditHours: t.creditHours,
    layoverDuration: t.layoverDuration,
    desiredDestinations: t.desiredDestinations,
    wtfDays: t.wtfDays,
    preferMinCredit: t.preferMinCredit,
    preferMaxCredit: t.preferMaxCredit,
  };
}

export interface SwapPostMatchResult {
  postId: string;
  viewerId: string;
  matchPercent: number;
  breakdown: ScoreBreakdown;
  matchingTrips: string[];
  reasons: string[];
  failReason: string | null;
  bestTripIndex?: number | null;
}

export async function calculateSwapPostMatch(
  viewerId: string,
  postId: string,
  options?: { viewerSignals?: ViewerSignals }
): Promise<SwapPostMatchResult> {
  const viewerSignals = options?.viewerSignals ?? (await buildViewerSignals(viewerId));

  if (!viewerHasComparableSignals(viewerSignals)) {
    return {
      postId,
      viewerId,
      matchPercent: 0,
      breakdown: emptyBreakdown(),
      matchingTrips: [],
      reasons: [],
      failReason: "no signals to compare",
      bestTripIndex: null,
    };
  }

  const [viewer, post] = await Promise.all([
    userRepo.findUserById(viewerId),
    swapPostRepo.findSwapPostByIdWithMatchingDetails(postId),
  ]);

  if (!viewer || !post || post.status !== "OPEN") {
    return {
      postId,
      viewerId,
      matchPercent: 0,
      breakdown: emptyBreakdown(),
      matchingTrips: [],
      reasons: [],
      failReason: "Missing viewer or post",
      bestTripIndex: null,
    };
  }

  const postOwner = post.user;
  if (postOwner.id === viewerId) {
    return {
      postId,
      viewerId,
      matchPercent: 0,
      breakdown: emptyBreakdown(),
      matchingTrips: [],
      reasons: [],
      failReason: "Own post",
      bestTripIndex: null,
    };
  }

  const offeredTripDates = post.offeredTrips.map((t) => t.departureDate);
  const primaryDate = offeredTripDates[0] ?? post.quickDate ?? new Date();
  const primaryMonth = primaryDate.getUTCMonth() + 1;
  const primaryYear = primaryDate.getUTCFullYear();
  const monthKeys = new Set(
    offeredTripDates.map((d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`)
  );
  monthKeys.add(`${primaryYear}-${String(primaryMonth).padStart(2, "0")}`);

  const schedules = await Promise.all(
    Array.from(monthKeys).map(async (key) => {
      const [yearRaw, monthRaw] = key.split("-");
      return scheduleRepo.findScheduleByUserAndMonth(viewer.id, Number(monthRaw), Number(yearRaw));
    })
  );

  const allViewerTrips = schedules.flatMap((s) => s?.trips ?? []);
  // Allow viewers with only a quick post (no uploaded schedule) to match via WTF/signal scoring.
  // Hard constraints handle empty trips gracefully (no conflicts, no aircraft evidence → passes).
  const primarySchedule = schedules.find((s) => s?.month === primaryMonth && s?.year === primaryYear)
    ?? { month: primaryMonth, year: primaryYear, trips: [] as NonNullable<(typeof schedules)[number]>["trips"] };

  const wtfGate =
    viewerSignals.hasExplicitWtfFromPosts && viewerSignals.wtfDateKeys.size > 0
      ? {
          hasExplicitWtfFromPosts: true,
          wtfDateKeys: viewerSignals.wtfDateKeys,
        }
      : null;

  const hardResult = checkHardConstraints(
    viewer,
    allViewerTrips,
    post,
    postOwner,
    primarySchedule.trips,
    wtfGate
  );

  if (!hardResult.passes) {
    return {
      postId,
      viewerId,
      matchPercent: 0,
      breakdown: emptyBreakdown(),
      matchingTrips: [],
      reasons: [],
      failReason: hardResult.failReason,
      bestTripIndex: null,
    };
  }

  const viewerMonthlyBlock = primarySchedule.trips.reduce((sum, t) => sum + (t.blockHours ?? 0), 0);
  const scheduleForScoring = {
    month: primarySchedule.month,
    year: primarySchedule.year,
    trips: primarySchedule.trips,
  };

  const scoreSingle = (postCandidate: typeof post, bestTripIndex?: number) => {
    const postLike = toPostLikeForScoring(postCandidate);
    const score = scoreWithSignalsOrFallbackSchedule(
      viewerSignals,
      postLike,
      primaryYear,
      primaryMonth,
      scheduleForScoring,
      viewerMonthlyBlock
    );
    return {
      postId,
      viewerId,
      matchPercent: score.total,
      breakdown: score.breakdown,
      matchingTrips: score.matchingTrips,
      reasons: score.reasons,
      failReason: null,
      bestTripIndex: bestTripIndex ?? null,
    };
  };

  if (post.offeredTrips.length <= 1) {
    return scoreSingle(post);
  }

  const bestResult = post.offeredTrips
    .map((trip, index) => scoreSingle({ ...post, offeredTrips: [trip] }, index))
    .reduce(
      (best, r) => (!best || r.matchPercent > best.matchPercent ? r : best),
      null as ReturnType<typeof scoreSingle> | null
    );

  return bestResult ?? scoreSingle(post);
}

export async function getTradeboardForViewer(
  viewerId: string,
  postIds: string[],
  options?: { maxCompute?: number; viewerSignals?: ViewerSignals; persistCache?: boolean }
): Promise<SwapPostMatchResult[]> {
  if (postIds.length === 0) return [];
  const persistCache = options?.persistCache !== false;
  const viewerSignals =
    options?.viewerSignals ?? (await buildViewerSignals(viewerId));

  if (!viewerHasComparableSignals(viewerSignals)) {
    return postIds.map((postId) => ({
      postId,
      viewerId,
      matchPercent: 0,
      breakdown: emptyBreakdown(),
      matchingTrips: [],
      reasons: [],
      failReason: "no signals to compare",
      bestTripIndex: null,
    }));
  }

  let cached: Array<{ postId: string; viewerId: string; matchPercent: number; reasons: string[] }> = [];
  let calculated: SwapPostMatchResult[] = [];
  try {
    cached = await prisma.matchCache.findMany({
      where: { viewerId, postId: { in: postIds } },
      select: { postId: true, viewerId: true, matchPercent: true, reasons: true },
    });
    const trustedCacheRows = cached.filter((c) => !matchCacheNeedsRecompute(c.reasons));
    const cachedByPost = new Map(trustedCacheRows.map((c) => [c.postId, c]));
    const stalePostIds = new Set(
      cached.filter((c) => matchCacheNeedsRecompute(c.reasons)).map((c) => c.postId)
    );
    const missingPostIds = postIds.filter((id) => !cachedByPost.has(id));
    const orderedMissing = [
      ...missingPostIds.filter((id) => stalePostIds.has(id)),
      ...missingPostIds.filter((id) => !stalePostIds.has(id)),
    ];
    const limitedMissingPostIds =
      options?.maxCompute != null ? orderedMissing.slice(0, Math.max(0, options.maxCompute)) : orderedMissing;
    calculated = await Promise.all(
      limitedMissingPostIds.map((postId) =>
        calculateSwapPostMatch(viewerId, postId, { viewerSignals })
      )
    );
    await cacheMatchResults(calculated, { persist: persistCache });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : undefined;
    if (code !== "P2021") throw error;
    calculated = await Promise.all(
      postIds.map((postId) => calculateSwapPostMatch(viewerId, postId, { viewerSignals }))
    );
  }

  const cachedResults: SwapPostMatchResult[] = cached
    .filter((c) => !matchCacheNeedsRecompute(c.reasons))
    .map((item) => ({
      postId: item.postId,
      viewerId,
      matchPercent: item.matchPercent,
      breakdown: emptyBreakdown(),
      matchingTrips: [],
      reasons: item.reasons,
      failReason: null,
      bestTripIndex: null,
    }));
  const merged = new Map<string, SwapPostMatchResult>();
  for (const r of [...cachedResults, ...calculated]) {
    merged.set(r.postId, r);
  }

  const results: SwapPostMatchResult[] = postIds.map(
    (postId) =>
      merged.get(postId) ?? {
        postId,
        viewerId,
        matchPercent: 0,
        breakdown: emptyBreakdown(),
        matchingTrips: [],
        reasons: [],
        failReason: null,
        bestTripIndex: null,
      }
  );

  results.sort((a, b) => {
    if (a.matchPercent > 0 && b.matchPercent === 0) return -1;
    if (a.matchPercent === 0 && b.matchPercent > 0) return 1;
    return b.matchPercent - a.matchPercent;
  });
  return results;
}

export async function cacheMatchResults(
  results: SwapPostMatchResult[],
  opts?: { persist?: boolean }
) {
  if (opts?.persist === false || results.length === 0) return;
  try {
    await Promise.all(
      results.map((item) =>
        prisma.matchCache.upsert({
          where: { postId_viewerId: { postId: item.postId, viewerId: item.viewerId } },
          create: {
            postId: item.postId,
            viewerId: item.viewerId,
            matchPercent: Math.round(item.matchPercent),
            reasons: item.reasons,
          },
          update: {
            matchPercent: Math.round(item.matchPercent),
            reasons: item.reasons,
            calculatedAt: new Date(),
          },
        })
      )
    );
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : undefined;
    if (code !== "P2021") throw error;
  }
}

export async function invalidateMatchCacheForPosts(postIds: string[]) {
  if (postIds.length === 0) return;
  try {
    await prisma.matchCache.deleteMany({ where: { postId: { in: postIds } } });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : undefined;
    if (code !== "P2021") throw error;
  }
}

export async function invalidateMatchCacheForViewer(viewerId: string) {
  try {
    await prisma.matchCache.deleteMany({ where: { viewerId } });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : undefined;
    if (code !== "P2021") throw error;
  }
}

export async function findMatchesForPost(postId: string): Promise<SwapPostMatchResult[]> {
  const post = await swapPostRepo.findSwapPostByIdWithMatchingDetails(postId);
  if (!post || post.status !== "OPEN") return [];

  const candidates = await prisma.user.findMany({
    where: {
      id: { not: post.userId },
      baseId: post.user.baseId,
      isActive: true,
    },
    select: { id: true },
  });

  const results = await Promise.all(
    candidates.map((candidate) => calculateSwapPostMatch(candidate.id, postId))
  );
  const ranked = results
    .filter((r) => r.matchPercent > 0)
    .sort((a, b) => b.matchPercent - a.matchPercent)
    .slice(0, MAX_MATCHES_TO_SAVE);

  await cacheMatchResults(ranked).catch((err) =>
    console.error("[matchEngine] failed to cache post-creation matches", err)
  );

  return ranked;
}

/**
 * High-affinity swap posts for /dashboard/matches — refreshes legacy cached reasons automatically.
 * `minPercent` defaults to `MATCHES_FEED_MIN_MATCH_PERCENT` (stricter than the trade board).
 */
export async function findHighAffinityPostsForUser(
  userId: string,
  minPercent = MATCHES_FEED_MIN_MATCH_PERCENT,
  take = 20
) {
  const viewer = await userRepo.findUserById(userId);
  if (!viewer?.baseId) return [];

  const signals = await buildViewerSignals(userId);
  if (!viewerHasComparableSignals(signals)) return [];

  // Read the full cache for this viewer (not just ≥threshold) so we benefit from
  // scores already computed by the board. The board caches every post it scores,
  // including ones below 40%, so filtering after the fact is free.
  let allCached = await prisma.matchCache.findMany({
    where: { viewerId: userId },
    orderBy: { matchPercent: "desc" },
    take: take * 4,
    select: { postId: true, matchPercent: true, reasons: true },
  });

  // Re-score any stale entries.
  const stale = allCached.filter((r) => matchCacheNeedsRecompute(r.reasons));
  if (stale.length > 0) {
    const refreshed = await Promise.all(
      stale.map((r) => calculateSwapPostMatch(userId, r.postId, { viewerSignals: signals }))
    );
    await cacheMatchResults(refreshed);
    allCached = await prisma.matchCache.findMany({
      where: { viewerId: userId },
      orderBy: { matchPercent: "desc" },
      take: take * 4,
      select: { postId: true, matchPercent: true, reasons: true },
    });
  }

  // Filter to qualifying matches from what the board already computed.
  let rows = allCached.filter((r) => r.matchPercent >= minPercent);

  // Cold-start: only when the cache is completely empty (brand-new user who has
  // never visited the Swaps board). Keep the batch small so it stays fast.
  if (allCached.length === 0) {
    const recent = await prisma.swapPost.findMany({
      where: {
        status: "OPEN",
        userId: { not: userId },
        user: { baseId: viewer.baseId },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true },
    });
    try {
      const computed = await withTimeout(
        Promise.all(recent.map((p) => calculateSwapPostMatch(userId, p.id, { viewerSignals: signals }))),
        5_000,
        "matches cold-start batch"
      );
      await cacheMatchResults(
        computed.filter((c) => c.failReason == null),
        { persist: true }
      );
    } catch (e) {
      if (!(e instanceof TimeoutError)) throw e;
    }
    rows = await prisma.matchCache.findMany({
      where: { viewerId: userId, matchPercent: { gte: minPercent } },
      orderBy: { matchPercent: "desc" },
      take,
      select: { postId: true, matchPercent: true, reasons: true },
    });
  }

  if (rows.length === 0) return [];

  const postIds = rows.map((r) => r.postId);
  const posts = await prisma.swapPost.findMany({
    where: { id: { in: postIds }, status: "OPEN" },
    select: swapPostSelect,
  });

  const postMap = new Map(posts.map((p) => [p.id, p]));
  const matchMap = new Map(rows.map((r) => [r.postId, r]));

  return postIds
    .map((postId) => {
      const post = postMap.get(postId);
      const cache = matchMap.get(postId);
      if (!post || !cache) return null;
      return {
        ...post,
        matchPercent: cache.matchPercent,
        matchReasons: cache.reasons,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function emptyBreakdown(): ScoreBreakdown {
  return {
    wtfDayOverlap: 0,
    destinationMatch: 0,
    blockHoursBalance: 0,
    tripTypeMatch: 0,
    sameDateBonus: 0,
    layoverDuration: 0,
    mutualSwap: 0,
    oneSidedFit: 0,
    dateAlignment: 0,
    blockBand: 0,
  };
}
