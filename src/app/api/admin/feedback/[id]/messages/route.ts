import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { requireSameOrigin } from "@/lib/csrf";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ data: null, error: "Validation", message: "Message is required" }, { status: 400 });
  }

  const [feedback, admin] = await Promise.all([
    prisma.feedback.findUnique({
      where: { id },
      select: { id: true, userId: true, subject: true, status: true },
    }),
    prisma.user.findUnique({ where: { id: auth.userId }, select: { id: true, email: true } }),
  ]);
  if (!feedback) {
    return NextResponse.json({ data: null, error: "NotFound", message: "Feedback not found" }, { status: 404 });
  }
  if (!admin) {
    return NextResponse.json({ data: null, error: "NotFound", message: "Admin not found" }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const msg = await tx.feedbackMessage.create({
      data: {
        feedbackId: id,
        senderId: admin.id,
        isAdmin: true,
        message: message.slice(0, 4000),
      },
    });
    await tx.feedback.update({
      where: { id },
      data: {
        status: feedback.status === "OPEN" ? "IN_PROGRESS" : feedback.status,
        hasUnreadByUser: true,
        hasUnreadByAdmin: false,
      },
    });
    await tx.notification.create({
      data: {
        userId: feedback.userId,
        type: "FEEDBACK_REPLY",
        title: "Reply to your ticket",
        message: `Support replied to: "${feedback.subject || "your ticket"}"`,
        data: { linkTo: `/dashboard/feedback/${id}` },
      },
    });
    await tx.adminAction.create({
      data: {
        adminUserId: admin.id,
        adminEmail: admin.email,
        action: "FEEDBACK_REPLY",
        targetUserId: feedback.userId,
        details: `Replied to feedback ${id}`,
      },
    });
    return msg;
  });

  return NextResponse.json({ data: result, error: null, message: null });
}
