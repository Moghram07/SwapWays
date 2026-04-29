import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withTimeout } from "@/lib/withTimeout";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }

  try {
    const tickets = await withTimeout(
      prisma.feedback.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          subject: true,
          status: true,
          hasUnreadByUser: true,
          createdAt: true,
        },
        take: 100,
      }),
      4500,
      "feedback mine query"
    );
    return NextResponse.json({ data: tickets, error: null, message: null });
  } catch (error) {
    console.error("[api/feedback/mine] degraded response due to transient DB failure", error);
    return NextResponse.json(
      {
        data: [],
        error: "ServiceUnavailable",
        message: "Feedback threads are temporarily unavailable. Please refresh in a moment.",
      },
      { status: 200 }
    );
  }
}
