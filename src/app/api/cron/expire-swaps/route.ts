import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSwapPostExpired, isTradeExpired } from "@/lib/swapExpiry";

const BATCH = 500;

const expireSwapPostSelect = {
  id: true,
  postType: true,
  expiresAt: true,
  vacationYear: true,
  vacationMonth: true,
  vacationStartDate: true,
  vacationEndDate: true,
  quickDate: true,
  createdAt: true,
  offeredTrips: {
    select: {
      departureDate: true,
      reportTime: true,
      scheduleTrip: { select: { reportTime: true } },
    },
  },
} as const;

const expireTradeSelect = {
  id: true,
  tradeType: true,
  departureDate: true,
  reportTime: true,
  vacationStartDate: true,
  vacationEndDate: true,
} as const;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let swapsExpired = 0;
  let tradesExpired = 0;

  for (;;) {
    const openPosts = await prisma.swapPost.findMany({
      where: { status: "OPEN" },
      select: expireSwapPostSelect,
      take: BATCH,
      orderBy: { id: "asc" },
    });
    if (openPosts.length === 0) break;

    const expiredPostIds = openPosts.filter((post) => isSwapPostExpired(post, now)).map((p) => p.id);
    if (expiredPostIds.length === 0) break;

    const result = await prisma.swapPost.updateMany({
      where: { id: { in: expiredPostIds }, status: "OPEN" },
      data: { status: "EXPIRED" },
    });
    swapsExpired += result.count;

    await prisma.matchCache.deleteMany({
      where: { postId: { in: expiredPostIds } },
    });
  }

  for (;;) {
    const openTrades = await prisma.trade.findMany({
      where: { status: "OPEN" },
      select: expireTradeSelect,
      take: BATCH,
      orderBy: { id: "asc" },
    });
    if (openTrades.length === 0) break;

    const expiredTradeIds = openTrades.filter((trade) => isTradeExpired(trade, now)).map((t) => t.id);
    if (expiredTradeIds.length === 0) break;

    const result = await prisma.trade.updateMany({
      where: { id: { in: expiredTradeIds }, status: "OPEN" },
      data: { status: "EXPIRED" },
    });
    tradesExpired += result.count;
  }

  return NextResponse.json({
    swapsExpired,
    tradesExpired,
    timestamp: now.toISOString(),
  });
}
