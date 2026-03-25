import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const count = await prisma.message.count({
      where: {
        isRead: false,
        senderId: { not: session.user.id },
        conversation: {
          OR: [
            { initiatorId: session.user.id },
            { tradeOwnerId: session.user.id },
            { postOwnerId: session.user.id },
          ],
        },
      },
    });

    return NextResponse.json({
      data: { messages: count },
      error: null,
      message: null,
    });
  } catch {
    return NextResponse.json(
      { data: null, error: "ServiceUnavailable", message: "Unread count temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }
}
