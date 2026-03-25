import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function unauthorized() {
  return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
}

function error(message: string, status: number) {
  return NextResponse.json({ data: null, error: "Error", message }, { status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  let body: { scheduleTripId?: string | null };
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON", 400);
  }

  const { scheduleTripId } = body;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
  });

  if (!conversation || conversation.initiatorId !== session.user.id) {
    return error("Unauthorized", 403);
  }

  if (conversation.swapPostId) {
    await prisma.$transaction(async (tx) => {
      await tx.conversationOffer.deleteMany({ where: { conversationId: id } });
      if (scheduleTripId) {
        await tx.conversationOffer.create({
          data: { conversationId: id, scheduleTripId },
        });
      }
      await tx.message.create({
        data: {
          conversationId: id,
          senderId: session.user.id,
          content: scheduleTripId ? "Changed offered trip(s)" : "Removed offered trip",
          messageType: "SYSTEM",
          systemAction: "TRIP_CHANGED",
        },
      });
    });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.conversation.update({
        where: { id },
        data: { offeredTripId: scheduleTripId ?? null },
      });
      await tx.message.create({
        data: {
          conversationId: id,
          senderId: session.user.id,
          content: "Changed offered trip",
          messageType: "SYSTEM",
          systemAction: "TRIP_CHANGED",
        },
      });
    });
  }

  return NextResponse.json({ data: { success: true }, error: null, message: null });
}
