import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidateConversationCache } from "@/lib/conversationCache";

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
  let body: { scheduleTripId?: string | null; swapPostTripId?: string | null };
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON", 400);
  }

  const scheduleTripId = body.scheduleTripId ?? null;
  const swapPostTripId = body.swapPostTripId ?? null;
  if (scheduleTripId && swapPostTripId) {
    return error("Offer exactly one of scheduleTripId or swapPostTripId", 400);
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id },
  });

  if (!conversation || conversation.initiatorId !== session.user.id) {
    return error("Unauthorized", 403);
  }

  // Ownership validation — a user may only offer a trip that is theirs.
  if (scheduleTripId) {
    const owned = await prisma.scheduleTrip.findFirst({
      where: { id: scheduleTripId, schedule: { userId: session.user.id } },
      select: { id: true },
    });
    if (!owned) return error("That trip is not in your schedule.", 422);
  }
  if (swapPostTripId) {
    if (!conversation.swapPostId) {
      return error("Posted trips can only be offered in swap-post conversations.", 422);
    }
    const owned = await prisma.swapPostTrip.findFirst({
      where: { id: swapPostTripId, swapPost: { userId: session.user.id, status: "OPEN" } },
      select: { id: true },
    });
    if (!owned) return error("That posted trip is not yours or is no longer active.", 422);
  }

  const hasOffer = Boolean(scheduleTripId || swapPostTripId);

  if (conversation.swapPostId) {
    await prisma.$transaction(async (tx) => {
      await tx.conversationOffer.deleteMany({ where: { conversationId: id } });
      if (hasOffer) {
        await tx.conversationOffer.create({
          data: {
            conversationId: id,
            scheduleTripId: scheduleTripId ?? null,
            swapPostTripId: swapPostTripId ?? null,
          },
        });
      }
      await tx.message.create({
        data: {
          conversationId: id,
          senderId: session.user.id,
          content: hasOffer ? "Changed offered trip(s)" : "Removed offered trip",
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

  invalidateConversationCache(id);

  return NextResponse.json({ data: { success: true }, error: null, message: null });
}
