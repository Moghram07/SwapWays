import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSwapPostExpired } from "@/lib/swapExpiry";
import { findSwapPostsForBoard } from "@/repositories/swapPostRepository";
import { getTradeboardForViewer } from "@/services/matching/matchEngine";

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const userId = session.user.id;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    schedule,
    activeSwaps,
    matchNotifications,
    unreadMessages,
    topMatches,
  ] = await Promise.all([
    prisma.schedule.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { lineNumber: true, month: true, year: true },
    }),
    Promise.all([
      prisma.swapPost.count({ where: { userId, status: "OPEN" } }),
      prisma.lineSwapPost.count({ where: { userId, status: "OPEN" } }),
    ]).then(([trips, lines]) => trips + lines),
    prisma.notification.findMany({
      where: {
        userId,
        type: "MATCH_FOUND",
        isRead: false,
        createdAt: { gte: sevenDaysAgo },
      },
      select: { data: true },
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
  ]);

  const newMatches = matchNotifications.reduce((count, n) => {
    const score = extractMatchPercent(n.data);
    return score > 50 ? count + 1 : count;
  }, 0);

  return json({
    schedule,
    activeSwaps,
    newMatches,
    unreadMessages,
    topMatches,
  });
}

type TopMatchItem = {
  postId: string;
  matchPercent: number;
  reasons: string[];
  flightNumber: string | null;
  destination: string | null;
  tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP" | null;
  posterRank: string;
  posterBase: string;
};

async function getTopMatchesForUser(userId: string, limit: number): Promise<TopMatchItem[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { baseId: true, rankId: true },
  });
  if (!user?.baseId) return [];

  const posts = await findSwapPostsForBoard(userId, user.baseId, { rankId: user.rankId });
  const openPosts = posts.filter((post) => !isSwapPostExpired(post, new Date()));
  if (openPosts.length === 0) return [];

  const matches = await getTradeboardForViewer(
    userId,
    openPosts.map((post) => post.id)
  );
  const matchMap = new Map(matches.map((m) => [m.postId, m]));

  return openPosts
    .map((post) => {
      const match = matchMap.get(post.id);
      const offered = post.offeredTrips[0];
      return {
        postId: post.id,
        matchPercent: match?.matchPercent ?? 0,
        reasons: match?.reasons ?? [],
        flightNumber: offered?.flightNumber ?? null,
        destination: offered?.destination ?? null,
        tripType: offered?.tripType ?? null,
        posterRank: post.user.rank.name,
        posterBase: post.user.base.name,
      };
    })
    .filter((item) => item.matchPercent >= 40)
    .sort((a, b) => b.matchPercent - a.matchPercent)
    .slice(0, limit);
}

function extractMatchPercent(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  if (!("matchPercent" in data)) return 0;
  const value = (data as { matchPercent?: unknown }).matchPercent;
  return typeof value === "number" ? value : Number(value) || 0;
}

