import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { trackEventServer } from "@/lib/analytics/server";
import { withTiming } from "@/lib/apiTimer";

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
  const timer = withTiming("GET /api/conversations/[id]/messages");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return timer.end(unauthorized());

  const { id } = await params;
  const { searchParams } = new URL(_request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(80, Math.max(1, parseInt(limitParam, 10))) : 50;
  const afterId = searchParams.get("after");
  const afterCreatedAt = searchParams.get("afterCreatedAt");

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: {
        id: true,
        initiatorId: true,
        tradeOwnerId: true,
        postOwnerId: true,
        initiator: { select: { id: true, firstName: true } },
        tradeOwner: { select: { id: true, firstName: true } },
        postOwner: { select: { id: true, firstName: true } },
      },
    });

    if (!conversation) return timer.end(error("Not found", 404));

    const isParticipant =
      conversation.initiatorId === session.user.id ||
      conversation.tradeOwnerId === session.user.id ||
      conversation.postOwnerId === session.user.id;

    if (!isParticipant) return timer.end(error("Unauthorized", 403));

    const senderNames = new Map<string, string>();
    if (conversation.initiator) senderNames.set(conversation.initiator.id, conversation.initiator.firstName);
    if (conversation.tradeOwner) senderNames.set(conversation.tradeOwner.id, conversation.tradeOwner.firstName);
    if (conversation.postOwner) senderNames.set(conversation.postOwner.id, conversation.postOwner.firstName);

    let messages: Array<{
      id: string;
      content: string;
      messageType: string;
      systemAction: string | null;
      senderId: string;
      createdAt: Date;
    }>;
    if (afterId) {
      const afterDate = afterCreatedAt ? new Date(afterCreatedAt) : null;
      messages = await prisma.message.findMany({
        where: {
          conversationId: id,
          ...(afterDate && !Number.isNaN(afterDate.getTime())
            ? {
                OR: [
                  { createdAt: { gt: afterDate } },
                  { createdAt: afterDate, id: { gt: afterId } },
                ],
              }
            : { id: { gt: afterId } }),
        },
        select: {
          id: true,
          content: true,
          messageType: true,
          systemAction: true,
          senderId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
        take: limit,
      });
    } else {
      const messagesDesc = await prisma.message.findMany({
        where: { conversationId: id },
        select: {
          id: true,
          content: true,
          messageType: true,
          systemAction: true,
          senderId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      messages = messagesDesc.reverse();
    }

    if (messages.some((m) => m.senderId !== session.user.id)) {
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
    }

    return timer.end(
      json(
        messages.map((m) => ({
          ...m,
          sender: {
            id: m.senderId,
            firstName: senderNames.get(m.senderId) ?? "Crew",
          },
        }))
      )
    );
  } catch {
    return timer.end(NextResponse.json(
      { data: null, error: "ServiceUnavailable", message: "Messages temporarily unavailable. Please try again." },
      { status: 503 }
    ));
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const timer = withTiming("POST /api/conversations/[id]/messages");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return timer.end(unauthorized());

  const { id } = await params;
  let body: { content?: string; messageType?: string; systemAction?: string };
  try {
    body = await request.json();
  } catch {
    return timer.end(error("Invalid JSON", 400));
  }

  const { content, messageType, systemAction } = body;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      initiatorId: true,
      tradeOwnerId: true,
      postOwnerId: true,
    },
  });

  if (!conversation) return timer.end(error("Not found", 404));

  const isParticipant =
    conversation.initiatorId === session.user.id ||
    conversation.tradeOwnerId === session.user.id ||
    conversation.postOwnerId === session.user.id;

  if (!isParticipant) return timer.end(error("Unauthorized", 403));

  if (conversation.status === "EXPIRED" || conversation.status === "DECLINED") {
    return timer.end(error("This conversation is closed", 400));
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

  return timer.end(json(message));
}
