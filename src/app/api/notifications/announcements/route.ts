import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withTimeout } from "@/lib/withTimeout";

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

  try {
    const notifications = await withTimeout(
      prisma.notification.findMany({
        where: { userId, type: "SYSTEM" },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      3500,
      "announcements fetch"
    );

    return NextResponse.json({
      data: {
        announcements: notifications.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          isRead: n.isRead,
          createdAt: n.createdAt.toISOString(),
        })),
        unreadCount: notifications.filter((n) => !n.isRead).length,
      },
      error: null,
      message: null,
    });
  } catch {
    return NextResponse.json({
      data: { announcements: [], unreadCount: 0 },
      error: null,
      message: null,
    });
  }
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  try {
    await withTimeout(
      prisma.notification.updateMany({
        where: { userId: session.user.id, type: "SYSTEM", isRead: false },
        data: { isRead: true },
      }),
      3500,
      "mark announcements read"
    );
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ data: null, error: null, message: "Marked as read" });
}
