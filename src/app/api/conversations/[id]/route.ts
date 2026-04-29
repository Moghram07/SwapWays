import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withTiming } from "@/lib/apiTimer";

const CONVERSATION_CACHE_TTL_MS = 15_000;
const conversationCache = new Map<string, { expiresAt: number; payload: unknown }>();

function unauthorized() {
  return NextResponse.json(
    { data: null, error: "Unauthorized", message: "Please sign in" },
    { status: 401 }
  );
}

function error(message: string, status: number) {
  return NextResponse.json({ data: null, error: "Error", message }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const timer = withTiming("GET /api/conversations/[id]");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return timer.end(unauthorized());

  const { id } = await params;
  const cacheKey = `${session.user.id}:${id}`;
  const cached = conversationCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return timer.end(NextResponse.json({ data: cached.payload, error: null, message: null }));
  }

  try {
    const scheduleTripMiniSelect = {
      id: true,
      tripNumber: true,
      startDate: true,
      reportTime: true,
      legs: {
        select: {
          flightNumber: true,
          departureAirport: true,
          arrivalAirport: true,
          legOrder: true,
          departureTime: true,
          arrivalTime: true,
        },
        orderBy: { legOrder: "asc" as const },
      },
      layovers: {
        select: { id: true },
        take: 1,
      },
    } as const;

    const conversationBase = await prisma.conversation.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        tradeId: true,
        swapPostId: true,
        initiatorId: true,
        tradeOwnerId: true,
        postOwnerId: true,
        offeredTripId: true,
        initiator: {
          select: {
            id: true,
            firstName: true,
            rank: { select: { name: true } },
            base: { select: { name: true } },
          },
        },
        tradeOwner: {
          select: {
            id: true,
            firstName: true,
            rank: { select: { name: true } },
            base: { select: { name: true } },
          },
        },
        postOwner: {
          select: {
            id: true,
            firstName: true,
            rank: { select: { name: true } },
            base: { select: { name: true } },
          },
        },
      },
    });

    if (!conversationBase) return timer.end(error("Not found", 404));

    const isParticipant =
      conversationBase.initiatorId === session.user.id ||
      conversationBase.tradeOwnerId === session.user.id ||
      conversationBase.postOwnerId === session.user.id;

    if (!isParticipant) return timer.end(error("Unauthorized", 403));

    const [tradeScheduleTrip, swapPost, offeredTrip, offeredTripLink] = await Promise.all([
      conversationBase.tradeId
        ? prisma.trade.findUnique({
            where: { id: conversationBase.tradeId },
            select: { scheduleTrip: { select: scheduleTripMiniSelect } },
          })
        : Promise.resolve(null),
      conversationBase.swapPostId
        ? prisma.swapPost.findUnique({
            where: { id: conversationBase.swapPostId },
            select: {
              offeredTrips: {
                select: {
                  scheduleTrip: {
                    select: scheduleTripMiniSelect,
                  },
                },
                take: 1,
              },
            },
          })
        : Promise.resolve(null),
      conversationBase.offeredTripId
        ? prisma.scheduleTrip.findUnique({
            where: { id: conversationBase.offeredTripId },
            select: scheduleTripMiniSelect,
          })
        : Promise.resolve(null),
      prisma.conversationOffer.findFirst({
        where: { conversationId: conversationBase.id },
        select: {
          scheduleTripId: true,
          scheduleTrip: {
            select: scheduleTripMiniSelect,
          },
        },
      }),
    ]);

    const conversation = {
      ...conversationBase,
      trade: tradeScheduleTrip ? { scheduleTrip: tradeScheduleTrip.scheduleTrip } : null,
      swapPost,
      offeredTrip,
      offeredTrips: offeredTripLink ? [offeredTripLink] : [],
    };
    conversationCache.set(cacheKey, {
      expiresAt: Date.now() + CONVERSATION_CACHE_TTL_MS,
      payload: conversation,
    });

    return timer.end(NextResponse.json({
      data: conversation,
      error: null,
      message: null,
    }));
  } catch {
    return timer.end(NextResponse.json(
      { data: null, error: "ServiceUnavailable", message: "Conversation temporarily unavailable. Please try again." },
      { status: 503 }
    ));
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: {
        id: true,
        initiatorId: true,
        tradeOwnerId: true,
        postOwnerId: true,
      },
    });

    if (!conversation) return error("Not found", 404);

    const isParticipant =
      conversation.initiatorId === session.user.id ||
      conversation.tradeOwnerId === session.user.id ||
      conversation.postOwnerId === session.user.id;

    if (!isParticipant) return error("Unauthorized", 403);

    await prisma.$transaction([
      prisma.message.deleteMany({ where: { conversationId: id } }),
      prisma.conversationOffer.deleteMany({ where: { conversationId: id } }),
      prisma.conversation.delete({ where: { id } }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { data: null, error: "ServiceUnavailable", message: "Failed to delete conversation." },
      { status: 503 }
    );
  }
}
