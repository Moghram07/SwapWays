import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSwapPostExpired, isTradeExpired } from "@/lib/swapExpiry";

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
  kind: "notification";
};

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

function unauthorized() {
  return NextResponse.json(
    { data: null, error: "Unauthorized", message: "Please sign in" },
    { status: 401 }
  );
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const userId = session.user.id;
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    user,
    upcomingFlightsCount,
    upcomingLegs,
    mySwapPosts,
    myVacationTrades,
    unreadMessagesCount,
    recentMatches,
    recentNotifications,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        airline: { select: { code: true } },
      },
    }),
    prisma.scheduleTripLeg.count({
      where: {
        scheduleTrip: { schedule: { userId } },
        departureDate: { gte: today },
      },
    }),
    prisma.scheduleTripLeg.findMany({
      where: {
        scheduleTrip: { schedule: { userId } },
        departureDate: { gte: today },
      },
      orderBy: { departureDate: "asc" },
      take: 5,
      select: {
        id: true,
        departureDate: true,
        departureAirport: true,
        arrivalAirport: true,
        flightNumber: true,
        aircraftTypeCode: true,
        scheduleTrip: { select: { reportTime: true } },
      },
    }),
    prisma.swapPost.findMany({
      where: {
        userId,
      },
      select: {
        status: true,
        postType: true,
        vacationYear: true,
        vacationMonth: true,
        vacationStartDate: true,
        offeredTrips: {
          select: {
            departureDate: true,
            scheduleTrip: { select: { reportTime: true } },
          },
        },
      },
    }),
    prisma.trade.findMany({
      where: {
        userId,
        tradeType: "VACATION_SWAP",
      },
      select: {
        status: true,
        tradeType: true,
        departureDate: true,
        reportTime: true,
        vacationStartDate: true,
      },
    }),
    prisma.message.count({
      where: {
        isRead: false,
        senderId: { not: userId },
        conversation: {
          OR: [{ initiatorId: userId }, { tradeOwnerId: userId }, { postOwnerId: userId }],
        },
      },
    }),
    prisma.match.findMany({
      where: {
        OR: [{ offererId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        trade: { select: { destination: true, departureDate: true, id: true } },
        offerer: { select: { firstName: true, lastName: true, rank: { select: { name: true } } } },
        receiver: { select: { firstName: true, lastName: true, rank: { select: { name: true } } } },
      },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        message: true,
        createdAt: true,
      },
    }),
  ]);

  const notificationActivities: ActivityItem[] = recentNotifications.map((n) => ({
    id: `notif:${n.id}`,
    title: n.title,
    detail: n.message,
    createdAt: n.createdAt.toISOString(),
    kind: "notification",
  }));

  const activity = notificationActivities
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const nonActiveStatuses = new Set(["CANCELLED", "COMPLETED", "EXPIRED", "AGREED", "ACCEPTED"]);
  const activeSwapPostsCount = mySwapPosts.filter(
    (post) => !nonActiveStatuses.has(post.status) && !isSwapPostExpired(post, now)
  ).length;
  const activeVacationTradesCount = myVacationTrades.filter(
    (trade) => !nonActiveStatuses.has(trade.status) && !isTradeExpired(trade, now)
  ).length;

  return json({
    user: {
      id: user?.id ?? userId,
      firstName: user?.firstName ?? "Crew",
      airlineCode: user?.airline?.code ?? "SV",
    },
    stats: {
      upcomingFlights: upcomingFlightsCount,
      activeSwaps: activeSwapPostsCount + activeVacationTradesCount,
      unreadMessages: unreadMessagesCount,
    },
    upcomingFlights: upcomingLegs.map((leg) => ({
      id: leg.id,
      departureDate: leg.departureDate.toISOString(),
      departureAirport: leg.departureAirport,
      arrivalAirport: leg.arrivalAirport,
      flightNumber: leg.flightNumber,
      aircraftTypeCode: leg.aircraftTypeCode,
      reportTime: leg.scheduleTrip.reportTime ?? null,
    })),
    recentMatches: recentMatches.map((m) => ({
      id: m.id,
      matchScore: m.matchScore,
      status: m.status,
      offererId: m.offererId,
      receiverId: m.receiverId,
      createdAt: m.createdAt.toISOString(),
      trade: {
        destination: m.trade?.destination ?? null,
        departureDate: m.trade?.departureDate?.toISOString() ?? null,
      },
      offerer: m.offerer,
      receiver: m.receiver,
    })),
    recentActivity: activity,
    generatedAt: now.toISOString(),
  });
}

