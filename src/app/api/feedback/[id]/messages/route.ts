import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSameOrigin } from "@/lib/csrf";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (message.length < 1) {
    return NextResponse.json({ data: null, error: "Validation", message: "Message is required" }, { status: 400 });
  }

  const feedback = await prisma.feedback.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, status: true },
  });
  if (!feedback) {
    return NextResponse.json({ data: null, error: "NotFound", message: "Ticket not found" }, { status: 404 });
  }
  if (feedback.status === "CLOSED") {
    return NextResponse.json({ data: null, error: "Closed", message: "Ticket is closed" }, { status: 400 });
  }

  const msg = await prisma.feedbackMessage.create({
    data: {
      feedbackId: id,
      senderId: session.user.id,
      isAdmin: false,
      message: message.slice(0, 4000),
    },
  });

  await prisma.feedback.update({
    where: { id },
    data: { hasUnreadByAdmin: true, hasUnreadByUser: false },
  });

  return NextResponse.json({ data: msg, error: null, message: null });
}
