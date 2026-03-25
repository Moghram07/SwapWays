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

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return error("Not found", 404);

  const isParticipant =
    conversation.initiatorId === session.user.id ||
    conversation.tradeOwnerId === session.user.id ||
    conversation.postOwnerId === session.user.id;
  if (!isParticipant) return error("Unauthorized", 403);
  if (conversation.status !== "SWAP_PROPOSED") return error("No swap proposed", 400);

  await prisma.$transaction(async (tx) => {
    await tx.conversation.update({
      where: { id },
      data: { status: "ACTIVE" },
    });
    await tx.message.create({
      data: {
        conversationId: id,
        senderId: session.user.id,
        content: "Declined the swap",
        messageType: "SYSTEM",
        systemAction: "SWAP_DECLINED",
      },
    });
  });

  return NextResponse.json({ data: { success: true }, error: null, message: null });
}
