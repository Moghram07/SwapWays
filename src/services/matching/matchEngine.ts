import * as tradeRepo from "@/repositories/tradeRepository";
import * as matchRepo from "@/repositories/matchRepository";
import * as scheduleRepo from "@/repositories/scheduleRepository";
import * as swapPostRepo from "@/repositories/swapPostRepository";
import * as userRepo from "@/repositories/userRepository";
import { filterByHardConstraints } from "./matchValidator";
import { scoreSingleMatch } from "./matchScorer";
import { checkHardConstraints } from "./hardConstraints";
import { calculateMatchScore, type ScoreBreakdown } from "./softScoring";
import { prisma } from "@/lib/prisma";
import type { MatchResult } from "@/types/match";

const MAX_MATCHES_TO_SAVE = 10;

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
    await matchRepo.createMatch({
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
}

export async function calculateSwapPostMatch(
  viewerId: string,
  postId: string
): Promise<SwapPostMatchResult> {
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
    };
  }

  const offeredTripDates = post.offeredTrips.map((t) => t.departureDate);
  const primaryDate = offeredTripDates[0] ?? new Date();
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
  const primarySchedule = schedules.find((s) => s?.month === primaryMonth && s?.year === primaryYear);

  if (!primarySchedule) {
    return {
      postId,
      viewerId,
      matchPercent: 0,
      breakdown: emptyBreakdown(),
      matchingTrips: [],
      reasons: [],
      failReason: "No schedule found for post month",
    };
  }

  const hardResult = checkHardConstraints(
    viewer,
    allViewerTrips,
    post,
    postOwner
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
    };
  }

  const viewerMonthlyBlock = primarySchedule.trips.reduce((sum, t) => sum + (t.blockHours ?? 0), 0);
  const score = calculateMatchScore(
    {
      month: primarySchedule.month,
      year: primarySchedule.year,
      trips: primarySchedule.trips,
    },
    viewerMonthlyBlock,
    post
  );

  return {
    postId,
    viewerId,
    matchPercent: score.total,
    breakdown: score.breakdown,
    matchingTrips: score.matchingTrips,
    reasons: score.reasons,
    failReason: null,
  };
}

export async function getTradeboardForViewer(
  viewerId: string,
  postIds: string[]
): Promise<SwapPostMatchResult[]> {
  const results = await Promise.all(
    postIds.map((postId) => calculateSwapPostMatch(viewerId, postId))
  );

  results.sort((a, b) => {
    if (a.matchPercent > 0 && b.matchPercent === 0) return -1;
    if (a.matchPercent === 0 && b.matchPercent > 0) return 1;
    return b.matchPercent - a.matchPercent;
  });
  return results;
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
  return results
    .filter((r) => r.matchPercent > 0)
    .sort((a, b) => b.matchPercent - a.matchPercent)
    .slice(0, MAX_MATCHES_TO_SAVE);
}

function emptyBreakdown(): ScoreBreakdown {
  return {
    wtfDayOverlap: 0,
    destinationMatch: 0,
    blockHoursBalance: 0,
    tripTypeMatch: 0,
    sameDateBonus: 0,
    layoverDuration: 0,
  };
}
