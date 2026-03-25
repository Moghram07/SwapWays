import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbiddenResponse, getCurrentUserAccess, unauthorizedResponse } from "@/lib/admin";

type CountRow = { count: bigint };
type TopPageRow = { path: string | null; views: bigint };

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
  const access = await getCurrentUserAccess();
  if (!access.session?.user?.id) return unauthorizedResponse();
  if (!access.isAdmin) return forbiddenResponse();

  try {
    const now = new Date();
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 7);
    const d30 = new Date(now);
    d30.setDate(d30.getDate() - 30);

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
    ]);

    const funnel = CORE_EVENTS.map((eventName) => ({
      eventName,
      count: Number(funnelRows.find((r) => r.eventName === eventName)?.count ?? BigInt(0)),
    }));

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
