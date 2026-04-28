import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }

  const { id } = await params;
  const feedback = await prisma.feedback.findFirst({
    where: { id, userId: session.user.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, message: true, isAdmin: true, createdAt: true },
      },
    },
  });

  if (!feedback) {
    return NextResponse.json({ data: null, error: "NotFound", message: "Ticket not found" }, { status: 404 });
  }

  return NextResponse.json({ data: feedback, error: null, message: null });
}
