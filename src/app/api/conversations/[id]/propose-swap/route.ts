import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

function unauthorized() {
  return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
}

function error(message: string, status: number) {
  return NextResponse.json({ data: null, error: "Error", message }, { status });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { trade: true, offeredTrips: true },
  });

  if (!conversation) return error("Not found", 404);

  const hasOfferedTrip = conversation.offeredTripId || (conversation.offeredTrips?.length ?? 0) > 0;
  if (!hasOfferedTrip) {
    return error("Select a trip to offer before proposing", 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.conversation.update({
      where: { id },
      data: { status: "SWAP_PROPOSED" },
    });

    await tx.message.create({
      data: {
        conversationId: id,
        senderId: session.user.id,
        content: "Proposed a formal swap",
        messageType: "SYSTEM",
        systemAction: "SWAP_PROPOSED",
      },
    });
  });

  const recipientId =
    conversation.initiatorId === session.user.id
      ? (conversation.tradeOwnerId ?? conversation.postOwnerId)
      : conversation.initiatorId;

  if (recipientId) {
    await createNotification({
      userId: recipientId,
      type: "SWAP_PROPOSED",
      title: "Swap proposed!",
      message: "A crew member has formally proposed a swap. Review and accept or decline.",
      data: { conversationId: id },
    });
  }

  return NextResponse.json({ data: { success: true }, error: null, message: null });
}
