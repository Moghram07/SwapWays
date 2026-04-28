import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findConversationsByUserId } from "@/repositories/conversationRepository";
import { createNotification } from "@/lib/notifications";
import { getUserAccess } from "@/utils/featureGates";
import { trackEventServer } from "@/lib/analytics/server";
import { requireSameOrigin } from "@/lib/csrf";
import { trackSession } from "@/lib/sessionTracker";

function unauthorized() {
  return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
}

function error(message: string, status: number) {
  return NextResponse.json({ data: null, error: "Error", message }, { status });
}

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

export async function POST(request: Request) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();
  const access = await getUserAccess(session.user.id);

  let body: {
    tradeId?: string;
    swapPostId?: string;
    offeredTripId?: string | null;
    offeredTripIds?: string[];
    initialMessage?: string;
  };
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON", 400);
  }

  const { tradeId, swapPostId, offeredTripId, offeredTripIds, initialMessage } = body;

  if (swapPostId) {
    const post = await prisma.swapPost.findUnique({
      where: { id: swapPostId },
      include: { user: true },
    });
    if (!post || post.status !== "OPEN") {
      return error("Post not found or no longer available", 404);
    }
    if (post.userId === session.user.id) {
      return error("Cannot message your own post", 400);
    }

    const existing = await prisma.conversation.findUnique({
      where: {
        swapPostId_initiatorId: { swapPostId, initiatorId: session.user.id },
      },
    });
    if (existing) {
      return json({ ...existing, isExisting: true });
    }

    if (!access.canStartNewConversation) {
      await trackEventServer({
        eventName: "free_limit_hit",
        userId: session.user.id,
        path: "/api/conversations",
        properties: { limit: "daily_conversation_start", source: "swap_post" },
      }).catch(() => {});
      return NextResponse.json(
        {
          data: null,
          error: "CONVERSATION_LIMIT_REACHED",
          feature: "multiple_conversations",
          message:
            "Free tier allows 1 new conversation per day. You can still reply in existing conversations, or upgrade to Premium for unlimited starts.",
        },
        { status: 403 }
      );
    }

    const tripIds = Array.isArray(offeredTripIds) ? offeredTripIds : offeredTripId ? [offeredTripId] : [];
    if (tripIds.length > 0) {
      const ownedTrips = await prisma.scheduleTrip.findMany({
        where: {
          id: { in: tripIds },
          schedule: { userId: session.user.id },
        },
        select: { id: true },
      });
      if (ownedTrips.length !== tripIds.length) {
        return error("One or more offered trips are invalid.", 422);
      }
    }

    const conversation = await prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.create({
        data: {
          initiatorId: session.user.id,
          swapPostId,
          postOwnerId: post.userId,
          lastMessageAt: new Date(),
        },
      });
      for (const scheduleTripId of tripIds) {
        await tx.conversationOffer.create({
          data: { conversationId: conv.id, scheduleTripId },
        });
      }
      if (initialMessage?.trim()) {
        await tx.message.create({
          data: {
            conversationId: conv.id,
            senderId: session.user.id,
            content: initialMessage.trim(),
            messageType: "TEXT",
          },
        });
      }
      if (tripIds.length > 0) {
        await tx.message.create({
          data: {
            conversationId: conv.id,
            senderId: session.user.id,
            content: "Offered trip(s) for swap",
            messageType: "SYSTEM",
            systemAction: "TRIP_OFFERED",
          },
        });
      }
      return conv;
    });

    await createNotification({
      userId: post.userId,
      type: "NEW_MESSAGE",
      title: "New swap inquiry",
      message: "A crew member is interested in your post",
      data: { conversationId: conversation.id },
    });
    return json(conversation);
  }

  if (!tradeId) return error("tradeId or swapPostId is required", 400);

  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: { user: true },
  });

  if (!trade || trade.status !== "OPEN") {
    return error("Trade not found or no longer available", 404);
  }

  if (trade.userId === session.user.id) {
    return error("Cannot message your own swap", 400);
  }

  const existing = await prisma.conversation.findUnique({
    where: {
      tradeId_initiatorId: {
        tradeId,
        initiatorId: session.user.id,
      },
    },
  });

  if (existing) {
    return json({ ...existing, isExisting: true });
  }

  if (!access.canStartNewConversation) {
    await trackEventServer({
      eventName: "free_limit_hit",
      userId: session.user.id,
      path: "/api/conversations",
      properties: { limit: "daily_conversation_start", source: "trade" },
    }).catch(() => {});
    return NextResponse.json(
      {
        data: null,
        error: "CONVERSATION_LIMIT_REACHED",
        feature: "multiple_conversations",
        message:
          "Free tier allows 1 new conversation per day. You can still reply in existing conversations, or upgrade to Premium for unlimited starts.",
      },
      { status: 403 }
    );
  }

  if (offeredTripId) {
    const ownedTrip = await prisma.scheduleTrip.findFirst({
      where: {
        id: offeredTripId,
        schedule: { userId: session.user.id },
      },
      select: { id: true },
    });
    if (!ownedTrip) {
      return error("Offered trip is invalid.", 422);
    }
  }

  const conversation = await prisma.$transaction(async (tx) => {
    const conv = await tx.conversation.create({
      data: {
        tradeId,
        initiatorId: session.user.id,
        tradeOwnerId: trade.userId,
        offeredTripId: offeredTripId || null,
        lastMessageAt: new Date(),
      },
    });

    if (initialMessage?.trim()) {
      await tx.message.create({
        data: {
          conversationId: conv.id,
          senderId: session.user.id,
          content: initialMessage.trim(),
          messageType: "TEXT",
        },
      });
    }

    if (offeredTripId) {
      await tx.message.create({
        data: {
          conversationId: conv.id,
          senderId: session.user.id,
          content: "Offered a trip for swap",
          messageType: "SYSTEM",
          systemAction: "TRIP_OFFERED",
        },
      });
    }

    return conv;
  });

  await createNotification({
    userId: trade.userId,
    type: "NEW_MESSAGE",
    title: "New swap inquiry",
    message: "A crew member is interested in your swap",
    data: { conversationId: conversation.id },
  });

  return json(conversation);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();
  await trackSession(session.user.id, request);
  const access = await getUserAccess(session.user.id);

  const withUnread = await findConversationsByUserId(session.user.id);
  const activeConversationStatuses = new Set(["ACTIVE", "SWAP_PROPOSED", "SWAP_ACCEPTED"]);
  const visibleConversations = access.canViewConversationHistory
    ? withUnread
    : withUnread.filter((conversation) => activeConversationStatuses.has(conversation.status));
  const allowedConversationId = visibleConversations[0]?.id ?? null;
  const conversationStartLimitReached =
    access.tier === "FREE" && !access.canStartNewConversation;
  return NextResponse.json({
    data: visibleConversations,
    meta: {
      tier: access.tier,
      canStartNewConversation: access.canStartNewConversation,
      conversationStartLimitReached,
      allowedConversationId,
      freeConversationStartsRemaining: access.freeConversationStartsRemaining,
      freeConversationDailyLimit: access.freeConversationDailyLimit,
    },
    error: null,
    message: null,
  });
}
