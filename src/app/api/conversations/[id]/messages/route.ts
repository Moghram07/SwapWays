import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { trackEventServer } from "@/lib/analytics/server";

function unauthorized() {
  return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
}

function error(message: string, status: number) {
  return NextResponse.json({ data: null, error: "Error", message }, { status });
}

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const { searchParams } = new URL(_request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : 100;
  const afterId = searchParams.get("after");

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) return error("Not found", 404);

    const isParticipant =
      conversation.initiatorId === session.user.id ||
      conversation.tradeOwnerId === session.user.id ||
      conversation.postOwnerId === session.user.id;

    if (!isParticipant) return error("Unauthorized", 403);

    let messages;
    if (afterId) {
      messages = await prisma.message.findMany({
        where: {
          conversationId: id,
          id: { gt: afterId },
        },
        include: {
          sender: { select: { id: true, firstName: true } },
        },
        orderBy: { createdAt: "asc" },
      });
    } else {
      const messagesDesc = await prisma.message.findMany({
        where: { conversationId: id },
        include: {
          sender: { select: { id: true, firstName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      messages = messagesDesc.reverse();
    }

    prisma.message
      .updateMany({
        where: {
          conversationId: id,
          senderId: { not: session.user.id },
          isRead: false,
        },
        data: { isRead: true },
      })
      .catch(() => {});

    return json(messages);
  } catch {
    return NextResponse.json(
      { data: null, error: "ServiceUnavailable", message: "Messages temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  let body: { content?: string; messageType?: string; systemAction?: string };
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON", 400);
  }

  const { content, messageType, systemAction } = body;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
  });

  if (!conversation) return error("Not found", 404);

  const isParticipant =
    conversation.initiatorId === session.user.id ||
    conversation.tradeOwnerId === session.user.id ||
    conversation.postOwnerId === session.user.id;

  if (!isParticipant) return error("Unauthorized", 403);

  if (conversation.status === "EXPIRED" || conversation.status === "DECLINED") {
    return error("This conversation is closed", 400);
  }

  const message = await prisma.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        conversationId: id,
        senderId: session.user.id,
        content: content ?? "",
        messageType: (messageType as "TEXT" | "SYSTEM" | "TRIP_OFFER") || "TEXT",
        systemAction: systemAction as "SWAP_PROPOSED" | "SWAP_ACCEPTED" | "SWAP_DECLINED" | "TRIP_OFFERED" | "TRIP_CHANGED" | "CONVERSATION_CLOSED" | undefined,
      },
    });

    await tx.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });

    return msg;
  });

  const recipientId =
    conversation.initiatorId === session.user.id
      ? (conversation.tradeOwnerId ?? conversation.postOwnerId)
      : conversation.initiatorId;

  if (recipientId) {
    await createNotification({
      userId: recipientId,
      type: "NEW_MESSAGE",
      title: "New message",
      message: (content ?? "").substring(0, 100),
      data: { conversationId: id },
    });
  }

  await trackEventServer({
    eventName: "message_sent",
    userId: session.user.id,
    path: `/dashboard/messages?id=${id}`,
    properties: { conversationId: id, messageType: message.messageType },
  }).catch(() => {});

  return json(message);
}
