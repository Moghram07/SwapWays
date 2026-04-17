import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalSignups,
    signupsThisMonth,
    signupsLastMonth,
    paidUsers,
    trialingUsers,
    freeUsers,
    totalSwapPosts,
    totalLineSwaps,
    totalConversations,
    totalMessages,
    totalSchedules,
    swapsThisWeek,
    messagesThisWeek,
    activeToday,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.user.count({
      where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
    }),
    prisma.user.count({ where: { tier: "PREMIUM", subscriptionStatus: "ACTIVE" } }),
    prisma.user.count({
      where: { subscriptionStatus: "TRIALING", trialEndsAt: { gt: now } },
    }),
    prisma.user.count({ where: { tier: "FREE" } }),
    prisma.swapPost.count(),
    prisma.lineSwapPost.count(),
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.schedule.count(),
    prisma.swapPost.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.message.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { updatedAt: { gte: startOfToday } } }),
  ]);

  const dailySignups: Array<{ date: string; count: number }> = [];
  for (let i = 29; i >= 0; i -= 1) {
    const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const count = await prisma.user.count({
      where: { createdAt: { gte: dayStart, lte: dayEnd } },
    });
    dailySignups.push({
      date: dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count,
    });
  }

  return json({
    totalSignups,
    signupsThisMonth,
    signupsLastMonth,
    paidUsers,
    trialingUsers,
    freeUsers,
    totalSwapPosts,
    totalLineSwaps,
    totalConversations,
    totalMessages,
    totalSchedules,
    swapsThisWeek,
    messagesThisWeek,
    activeToday,
    dailySignups,
  });
}
