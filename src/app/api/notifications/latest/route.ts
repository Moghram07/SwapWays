import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findNotificationsByUserId } from "@/lib/notifications";
import { withTimeout } from "@/lib/withTimeout";

type DbNotification = Awaited<ReturnType<typeof findNotificationsByUserId>>[number];

function unauthorized() {
  return NextResponse.json(
    { data: null, error: "Unauthorized", message: "Please sign in" },
    { status: 401 }
  );
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  try {
    const notifications: DbNotification[] = await withTimeout(
      findNotificationsByUserId(session.user.id, 5),
      3500,
      "notifications latest"
    );

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({
      data: {
        notifications: notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          isRead: n.isRead,
          data: n.data,
          createdAt: n.createdAt.toISOString(),
        })),
        unreadCount,
      },
      error: null,
      message: null,
    });
  } catch {
    return NextResponse.json(
      { data: { notifications: [], unreadCount: 0 }, error: null, message: null },
      { status: 200 }
    );
  }
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  try {
    await withTimeout(
      prisma.notification.updateMany({
        where: { userId: session.user.id, isRead: false },
        data: { isRead: true },
      }),
      3500,
      "notifications mark-all-read"
    );
    return NextResponse.json({ data: null, error: null, message: "Marked as read" });
  } catch {
    return NextResponse.json(
      { data: null, error: "ServiceUnavailable", message: "Could not mark as read" },
      { status: 200 }
    );
  }
}
