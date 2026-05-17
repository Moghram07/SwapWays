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
    const [msgCount, notifCounts] = await withTimeout(
      Promise.all([
        prisma.message.count({
          where: {
            isRead: false,
            senderId: { not: userId },
            conversation: {
              OR: [
                { initiatorId: userId },
                { tradeOwnerId: userId },
                { postOwnerId: userId },
              ],
            },
          },
        }),
        prisma.notification.groupBy({
          by: ["type"],
          where: { userId, isRead: false, type: { in: ["MATCH_FOUND", "SYSTEM"] } },
          _count: true,
        }),
      ]),
      4000,
      "activity counts"
    );

    const sysCount = notifCounts.find((r) => r.type === "SYSTEM")?._count ?? 0;
    const matches = notifCounts.find((r) => r.type === "MATCH_FOUND")?._count ?? 0;
    const messages = msgCount + sysCount;
    return NextResponse.json({ data: { messages, matches }, error: null, message: null });
  } catch {
    return NextResponse.json(
      { data: { messages: 0, matches: 0 }, error: null, message: null },
      { status: 200 }
    );
  }
}
