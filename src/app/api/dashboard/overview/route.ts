import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMatchTier, getUserAccess } from "@/utils/featureGates";
import { withTiming } from "@/lib/apiTimer";

const OVERVIEW_CACHE_TTL_MS = 20_000;
const overviewCache = new Map<string, { expiresAt: number; payload: unknown }>();

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

function unauthorized() {
  return NextResponse.json(
    { data: null, error: "Unauthorized", message: "Please sign in" },
    { status: 401 }
  );
}

export async function GET() {
  const timer = withTiming("GET /api/dashboard/overview");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return timer.end(unauthorized());

  const userId = session.user.id;
  const cached = overviewCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return timer.end(json(cached.payload));
  }
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    access,
    user,
    schedule,
    activeSwaps,
    newMatches,
    unreadMessages,
    topMatches,
    usedReferrals,
  ] = await Promise.all([
    getUserAccess(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        trialStartedAt: true,
        trialEndsAt: true,
      },
    }),
    prisma.schedule.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { lineNumber: true, month: true, year: true },
    }),
    Promise.all([
      prisma.swapPost.count({ where: { userId, status: "OPEN" } }),
      prisma.lineSwapPost.count({ where: { userId, status: "OPEN" } }),
    ]).then(([trips, lines]) => trips + lines),
    prisma.notification.count({
      where: {
        userId,
        type: "MATCH_FOUND",
        isRead: false,
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.message.count({
      where: {
        isRead: false,
        senderId: { not: userId },
        conversation: {
          OR: [{ initiatorId: userId }, { tradeOwnerId: userId }, { postOwnerId: userId }],
        },
      },
    }),
    getTopMatchesForUser(userId, 3),
    prisma.referral.count({
      where: { referrerUserId: userId },
    }),
  ]);

  const trialCapReached = usedReferrals >= 3;
  const referralCode = user?.referralCode ?? null;
  const referralLink = referralCode
    ? `${process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ""}/register?ref=${referralCode}`
    : null;
  const payload = {
    schedule,
    activeSwaps,
    newMatches,
    unreadMessages,
    referral: {
      referralCode,
      referralLink,
      usedReferrals,
      remainingReferrals: Math.max(0, 3 - usedReferrals),
      trialCapReached,
    },
    topMatches: topMatches.map((item) => ({
      ...item,
      matchTier: getMatchTier(item.matchPercent ?? 0),
      matchPercent: access.canSeeExactMatch ? item.matchPercent : null,
    })),
  };
  overviewCache.set(userId, { expiresAt: Date.now() + OVERVIEW_CACHE_TTL_MS, payload });
  return timer.end(json(payload));
}

type TopMatchItem = {
  postId: string;
  matchPercent: number | null;
  matchTier: "low" | "medium" | "high" | "none";
  reasons: string[];
  flightNumber: string | null;
  destination: string | null;
  tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP" | null;
  posterRank: string;
  posterBase: string;
};

async function getTopMatchesForUser(userId: string, limit: number): Promise<TopMatchItem[]> {
  const cached = await prisma.matchCache.findMany({
    where: { viewerId: userId, matchPercent: { gte: 40 } },
    orderBy: { matchPercent: "desc" },
    take: limit * 3,
    select: { postId: true, matchPercent: true, reasons: true },
  });
  if (cached.length === 0) return [];

  const posts = await prisma.swapPost.findMany({
    where: {
      id: { in: cached.map((c) => c.postId) },
      status: "OPEN",
      userId: { not: userId },
    },
    select: {
      id: true,
      offeredTrips: {
        select: {
          flightNumber: true,
          destination: true,
          tripType: true,
          departureDate: true,
        },
        take: 1,
      },
      user: {
        select: {
          rank: { select: { name: true } },
          base: { select: { name: true } },
        },
      },
    },
  });
  const postMap = new Map(posts.map((p) => [p.id, p]));

  const results: TopMatchItem[] = [];
  for (const cacheItem of cached) {
    const post = postMap.get(cacheItem.postId);
    if (!post) continue;
    const offered = post.offeredTrips[0];
    const tripDate = offered?.departureDate ?? null;
    if (tripDate && tripDate.getTime() < Date.now()) continue;
    results.push({
      postId: post.id,
      matchPercent: cacheItem.matchPercent,
      matchTier: getMatchTier(cacheItem.matchPercent),
      reasons: cacheItem.reasons,
      flightNumber: offered?.flightNumber ?? null,
      destination: offered?.destination ?? null,
      tripType: offered?.tripType ?? null,
      posterRank: post.user.rank.name,
      posterBase: post.user.base.name,
    });
    if (results.length >= limit) break;
  }
  return results;
}

