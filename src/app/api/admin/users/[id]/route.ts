import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, isAdmin: true },
  });

  if (!user) {
    return NextResponse.json({ data: null, error: "NotFound", message: "User not found" }, { status: 404 });
  }
  if (user.isAdmin) {
    return NextResponse.json({ data: null, error: "Forbidden", message: "Cannot delete admin accounts" }, { status: 403 });
  }

  // Manual cascade in the correct FK order
  await prisma.$transaction(async (tx) => {
    await tx.message.deleteMany({ where: { senderId: id } });

    const convos = await tx.conversation.findMany({
      where: { OR: [{ initiatorId: id }, { tradeOwnerId: id }, { postOwnerId: id }] },
      select: { id: true },
    });
    const convoIds = convos.map((c) => c.id);
    if (convoIds.length > 0) {
      await tx.message.deleteMany({ where: { conversationId: { in: convoIds } } });
      await tx.conversation.deleteMany({ where: { id: { in: convoIds } } });
    }

    await tx.match.deleteMany({ where: { OR: [{ offererId: id }, { receiverId: id }] } });

    const posts = await tx.swapPost.findMany({ where: { userId: id }, select: { id: true } });
    const postIds = posts.map((p) => p.id);
    if (postIds.length > 0) {
      await tx.matchCache.deleteMany({ where: { postId: { in: postIds } } });
      await tx.swapPostTrip.deleteMany({ where: { swapPostId: { in: postIds } } });
    }
    await tx.matchCache.deleteMany({ where: { viewerId: id } });
    await tx.swapPost.deleteMany({ where: { userId: id } });
    await tx.trade.deleteMany({ where: { userId: id } });
    await tx.lineSwapPost.deleteMany({ where: { userId: id } });
    await tx.notification.deleteMany({ where: { userId: id } });

    const feedbacks = await tx.feedback.findMany({ where: { userId: id }, select: { id: true } });
    const fbIds = feedbacks.map((f) => f.id);
    if (fbIds.length > 0) {
      await tx.feedbackMessage.deleteMany({ where: { feedbackId: { in: fbIds } } });
    }
    await tx.feedback.deleteMany({ where: { userId: id } });
    await tx.feedbackMessage.deleteMany({ where: { senderId: id } });
    await tx.appEvent.deleteMany({ where: { userId: id } });
    await tx.userSession.deleteMany({ where: { userId: id } });
    await tx.userQualification.deleteMany({ where: { userId: id } });

    const schedules = await tx.schedule.findMany({ where: { userId: id }, select: { id: true } });
    const schedIds = schedules.map((s) => s.id);
    if (schedIds.length > 0) {
      const trips = await tx.scheduleTrip.findMany({ where: { scheduleId: { in: schedIds } }, select: { id: true } });
      const tripIds = trips.map((t) => t.id);
      if (tripIds.length > 0) {
        await tx.scheduleTripLeg.deleteMany({ where: { scheduleTripId: { in: tripIds } } });
        await tx.scheduleTripLayover.deleteMany({ where: { scheduleTripId: { in: tripIds } } });
      }
      await tx.scheduleTrip.deleteMany({ where: { scheduleId: { in: schedIds } } });
      await tx.schedule.deleteMany({ where: { id: { in: schedIds } } });
    }

    await tx.accountFlag.deleteMany({ where: { userId: id } });
    await tx.trialReward.deleteMany({ where: { userId: id } });
    await tx.referral.deleteMany({ where: { OR: [{ referrerUserId: id }, { referredUserId: id }] } });
    await tx.feedback.updateMany({ where: { assigneeId: id }, data: { assigneeId: null } });
    await tx.emailVerificationCode.deleteMany({ where: { userId: id } });
    await tx.passwordResetToken.deleteMany({ where: { userId: id } });
    await tx.adminAction.deleteMany({ where: { adminUserId: id } });
    await tx.adminAction.updateMany({ where: { targetUserId: id }, data: { targetUserId: null } });
    await tx.user.delete({ where: { id } });
  }, { timeout: 30000 });

  return NextResponse.json({ data: { deleted: true }, error: null, message: `User ${user.email} deleted.` });
}
