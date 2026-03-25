import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
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
        trade: {
          include: {
            scheduleTrip: {
              include: {
                legs: {
                  select: {
                    flightNumber: true,
                    departureAirport: true,
                    arrivalAirport: true,
                    legOrder: true,
                    departureTime: true,
                    arrivalTime: true,
                  },
                  orderBy: { legOrder: "asc" },
                },
                layovers: {
                  select: { airport: true, durationDecimal: true, afterLegOrder: true },
                  orderBy: { afterLegOrder: "asc" },
                },
              },
            },
          },
        },
        offeredTrip: {
          include: {
            legs: {
              select: {
                flightNumber: true,
                departureAirport: true,
                arrivalAirport: true,
                legOrder: true,
                departureTime: true,
                arrivalTime: true,
              },
              orderBy: { legOrder: "asc" },
            },
            layovers: {
              select: { airport: true, durationDecimal: true, afterLegOrder: true },
              orderBy: { afterLegOrder: "asc" },
            },
          },
        },
        swapPost: {
          include: {
            offeredTrips: {
              include: {
                scheduleTrip: {
                  include: {
                    legs: {
                      select: {
                        flightNumber: true,
                        departureAirport: true,
                        arrivalAirport: true,
                        legOrder: true,
                        departureTime: true,
                        arrivalTime: true,
                      },
                      orderBy: { legOrder: "asc" },
                    },
                    layovers: {
                      select: { airport: true, durationDecimal: true, afterLegOrder: true },
                      orderBy: { afterLegOrder: "asc" },
                    },
                  },
                },
              },
            },
          },
        },
        offeredTrips: {
          include: {
            scheduleTrip: {
              include: {
                legs: { select: { flightNumber: true, departureAirport: true, arrivalAirport: true, legOrder: true, departureTime: true, arrivalTime: true }, orderBy: { legOrder: "asc" } },
                layovers: { select: { airport: true, durationDecimal: true, afterLegOrder: true }, orderBy: { afterLegOrder: "asc" } },
              },
            },
          },
        },
      },
    });

    if (!conversation) return error("Not found", 404);

    const isParticipant =
      conversation.initiatorId === session.user.id ||
      conversation.tradeOwnerId === session.user.id ||
      conversation.postOwnerId === session.user.id;

    if (!isParticipant) return error("Unauthorized", 403);

    return NextResponse.json({
      data: conversation,
      error: null,
      message: null,
    });
  } catch {
    return NextResponse.json(
      { data: null, error: "ServiceUnavailable", message: "Conversation temporarily unavailable. Please try again." },
      { status: 503 }
    );
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
