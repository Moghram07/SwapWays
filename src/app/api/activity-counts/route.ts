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
    const [msgCount, sysCount, matches] = await withTimeout(
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
        // Announcements (SYSTEM) live in the Messages section, so count them there
        prisma.notification.count({
          where: { userId, type: "SYSTEM", isRead: false },
        }),
        prisma.notification.count({
          where: { userId, type: "MATCH_FOUND", isRead: false },
        }),
      ]),
      4000,
      "activity counts"
    );

    const messages = msgCount + sysCount;
    return NextResponse.json({ data: { messages, matches }, error: null, message: null });
  } catch {
    return NextResponse.json(
      { data: { messages: 0, matches: 0 }, error: null, message: null },
      { status: 200 }
    );
  }
}
