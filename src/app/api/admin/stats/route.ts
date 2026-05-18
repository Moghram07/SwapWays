import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

type CountRow = { count: bigint };
type TopPageRow = { path: string | null; views: bigint };
type DailyEventRow = { saudi_day: Date; page_views: bigint; unique_visitors: bigint };
type DailyCountRow = { saudi_day: Date; count: bigint };

function getSaudiDayStart(now: Date): Date {
  const shifted = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const midnight = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
  return new Date(midnight.getTime() + 3 * 60 * 60 * 1000);
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

const CORE_EVENTS = ["user_registered", "user_logged_in", "swap_post_created", "message_sent", "schedule_uploaded"];

function isMissingRelationError(e: unknown, relationName: string) {
  if (!(e instanceof Error)) return false;
  const text = e.message.toLowerCase();
  return text.includes("42p01") && text.includes(relationName.toLowerCase());
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const now = new Date();
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 7);
    const d30 = new Date(now);
    d30.setDate(d30.getDate() - 30);
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const todayStart = getSaudiDayStart(now);
    const d14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      feedbackOpen,
      feedbackInProgress,
      feedbackClosed,
      activeUsers7,
      activeUsers30,
      pageViews7,
      pageViews30,
      topPages,
      funnelRows,
      newUsersThisWeek,
      premiumPaidUsers,
      trialingUsers,
      trialsExpiringThisWeek,
      openSwapPosts,
      openLineSwapPosts,
      activeConversations,
      recentSignups,
      recentFeedback,
      unresolvedFlags,
      unreadFeedbackByAdmin,
      dailyEvents,
      dailyNewUsers,
      dailyNewPosts,
      todayPageViews,
      todayNewUsers,
      todayNewPosts,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.$queryRaw<CountRow[]>`SELECT COUNT(*)::bigint AS count FROM "Feedback" WHERE "status" = 'OPEN'::"FeedbackStatus"`,
      prisma.$queryRaw<CountRow[]>`SELECT COUNT(*)::bigint AS count FROM "Feedback" WHERE "status" = 'IN_PROGRESS'::"FeedbackStatus"`,
      prisma.$queryRaw<CountRow[]>`SELECT COUNT(*)::bigint AS count FROM "Feedback" WHERE "status" = 'CLOSED'::"FeedbackStatus"`,
      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(DISTINCT COALESCE("userId", "anonymousId"))::bigint AS count
        FROM "AppEvent"
        WHERE "createdAt" >= ${d7}
      `,
      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(DISTINCT COALESCE("userId", "anonymousId"))::bigint AS count
        FROM "AppEvent"
        WHERE "createdAt" >= ${d30}
      `,
      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*)::bigint AS count
        FROM "AppEvent"
        WHERE "eventName" = 'page_view' AND "createdAt" >= ${d7}
      `,
      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*)::bigint AS count
        FROM "AppEvent"
        WHERE "eventName" = 'page_view' AND "createdAt" >= ${d30}
      `,
      prisma.$queryRaw<TopPageRow[]>`
        SELECT "path", COUNT(*)::bigint AS views
        FROM "AppEvent"
        WHERE "eventName" = 'page_view' AND "createdAt" >= ${d30}
        GROUP BY "path"
        ORDER BY views DESC
        LIMIT 5
      `,
      prisma.$queryRaw<Array<{ eventName: string; count: bigint }>>`
        SELECT "eventName", COUNT(*)::bigint AS count
        FROM "AppEvent"
        WHERE "eventName" IN (${CORE_EVENTS[0]}, ${CORE_EVENTS[1]}, ${CORE_EVENTS[2]}, ${CORE_EVENTS[3]}, ${CORE_EVENTS[4]})
          AND "createdAt" >= ${d30}
        GROUP BY "eventName"
      `,
      prisma.user.count({ where: { createdAt: { gte: d7 } } }),
      prisma.user.count({
        where: { tier: "PREMIUM", subscriptionStatus: "ACTIVE" },
      }),
      prisma.user.count({ where: { subscriptionStatus: "TRIALING" } }),
      prisma.user.count({
        where: {
          subscriptionStatus: "TRIALING",
          trialEndsAt: { gte: now, lte: weekAhead },
        },
      }),
      prisma.swapPost.count({ where: { status: "OPEN" } }),
      prisma.lineSwapPost.count({ where: { status: "OPEN" } }),
      prisma.conversation.count({ where: { status: "ACTIVE" } }),
      prisma.user.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true,
          tier: true,
          subscriptionStatus: true,
          rank: { select: { name: true } },
        },
      }),
      prisma.feedback.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          status: true,
          subject: true,
          createdAt: true,
          user: { select: { firstName: true, email: true } },
        },
      }),
      prisma.accountFlag.count({ where: { isResolved: false } }),
      prisma.feedback.count({ where: { hasUnreadByAdmin: true } }),
      prisma.$queryRaw<DailyEventRow[]>`
        SELECT
          DATE_TRUNC('day', "createdAt" - INTERVAL '3 hours') AS saudi_day,
          COUNT(*) FILTER (WHERE "eventName" = 'page_view')::bigint AS page_views,
          COUNT(DISTINCT COALESCE("userId", "anonymousId")) FILTER (WHERE "eventName" = 'page_view')::bigint AS unique_visitors
        FROM "AppEvent"
        WHERE "createdAt" >= ${d14}
        GROUP BY 1
        ORDER BY 1 DESC
      `,
      prisma.$queryRaw<DailyCountRow[]>`
        SELECT
          DATE_TRUNC('day', "createdAt" - INTERVAL '3 hours') AS saudi_day,
          COUNT(*)::bigint AS count
        FROM "User"
        WHERE "createdAt" >= ${d14}
        GROUP BY 1
        ORDER BY 1 DESC
      `,
      prisma.$queryRaw<DailyCountRow[]>`
        SELECT
          DATE_TRUNC('day', "createdAt" - INTERVAL '3 hours') AS saudi_day,
          COUNT(*)::bigint AS count
        FROM "SwapPost"
        WHERE "createdAt" >= ${d14}
        GROUP BY 1
        ORDER BY 1 DESC
      `,
      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*)::bigint AS count
        FROM "AppEvent"
        WHERE "eventName" = 'page_view' AND "createdAt" >= ${todayStart}
      `,
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.swapPost.count({ where: { createdAt: { gte: todayStart } } }),
    ]);

    // Merge daily event, user, and post rows into a single keyed map
    const dailyMap = new Map<string, { pageViews: number; uniqueVisitors: number; newUsers: number; newPosts: number }>();
    const emptyDay = () => ({ pageViews: 0, uniqueVisitors: 0, newUsers: 0, newPosts: 0 });
    for (const r of dailyEvents) {
      const key = toDateKey(r.saudi_day);
      const row = dailyMap.get(key) ?? emptyDay();
      row.pageViews = Number(r.page_views);
      row.uniqueVisitors = Number(r.unique_visitors);
      dailyMap.set(key, row);
    }
    for (const r of dailyNewUsers) {
      const key = toDateKey(r.saudi_day);
      const row = dailyMap.get(key) ?? emptyDay();
      row.newUsers = Number(r.count);
      dailyMap.set(key, row);
    }
    for (const r of dailyNewPosts) {
      const key = toDateKey(r.saudi_day);
      const row = dailyMap.get(key) ?? emptyDay();
      row.newPosts = Number(r.count);
      dailyMap.set(key, row);
    }
    const daily = Array.from(dailyMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 14)
      .map(([day, v]) => ({ day, ...v }));

    const today = {
      pageViews: Number(todayPageViews[0]?.count ?? BigInt(0)),
      newUsers: todayNewUsers,
      newPosts: todayNewPosts,
    };

    const funnel = CORE_EVENTS.map((eventName) => ({
      eventName,
      count: Number(funnelRows.find((r) => r.eventName === eventName)?.count ?? BigInt(0)),
    }));

    const premiumPaid = premiumPaidUsers;
    const premiumPercent =
      totalUsers > 0 ? Math.round((premiumPaid / totalUsers) * 100) : 0;

    return json({
      generatedAt: now.toISOString(),
      users: {
        total: totalUsers,
        active7d: Number(activeUsers7[0]?.count ?? BigInt(0)),
        active30d: Number(activeUsers30[0]?.count ?? BigInt(0)),
      },
      traffic: {
        pageViews7d: Number(pageViews7[0]?.count ?? BigInt(0)),
        pageViews30d: Number(pageViews30[0]?.count ?? BigInt(0)),
        topPages: topPages.map((p) => ({ path: p.path || "/", views: Number(p.views) })),
      },
      feedback: {
        open: Number(feedbackOpen[0]?.count ?? BigInt(0)),
        inProgress: Number(feedbackInProgress[0]?.count ?? BigInt(0)),
        closed: Number(feedbackClosed[0]?.count ?? BigInt(0)),
      },
      funnel,
      daily,
      today,
      overview: {
        newUsersThisWeek,
        premiumUsers: premiumPaid,
        premiumPercent,
        trialingUsers,
        trialsExpiringThisWeek,
        openSwapPosts,
        openLineSwapPosts,
        activeConversations,
        recentSignups,
        recentFeedback,
        unresolvedFlags,
        unreadFeedbackByAdmin,
      },
    });
  } catch (e) {
    if (isMissingRelationError(e, "AppEvent") || isMissingRelationError(e, "Feedback")) {
      const now = new Date();
      const totalUsers = await prisma.user.count().catch(() => 0);
      return json({
        generatedAt: now.toISOString(),
        users: { total: totalUsers, active7d: 0, active30d: 0 },
        traffic: { pageViews7d: 0, pageViews30d: 0, topPages: [] as Array<{ path: string; views: number }> },
        feedback: { open: 0, inProgress: 0, closed: 0 },
        funnel: CORE_EVENTS.map((eventName) => ({ eventName, count: 0 })),
        overview: {
          newUsersThisWeek: 0,
          premiumUsers: 0,
          premiumPercent: 0,
          trialingUsers: 0,
          trialsExpiringThisWeek: 0,
          openSwapPosts: 0,
          openLineSwapPosts: 0,
          activeConversations: 0,
          recentSignups: [] as unknown[],
          recentFeedback: [] as unknown[],
          unresolvedFlags: 0,
          unreadFeedbackByAdmin: 0,
        },
      });
    }
    return NextResponse.json(
      {
        data: null,
        error: "Error",
        message:
          e instanceof Error
            ? e.message
            : "Failed to load admin stats. Ensure required analytics tables exist.",
      },
      { status: 500 }
    );
  }
}
