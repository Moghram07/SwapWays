import { prisma } from "@/lib/prisma";
import type { CreateTradeInput } from "@/types/trade";
import type { TradeStatus } from "@/types/enums";

const tradeWithUserSelect = {
  id: true,
  tradeType: true,
  status: true,
  scheduleTripId: true,
  tripNumber: true,
  flightNumber: true,
  aircraftTypeCode: true,
  destination: true,
  departureDate: true,
  departureTime: true,
  reportTime: true,
  flyingTime: true,
  layoverDuration: true,
  creditHours: true,
  tafb: true,
  desiredDestinations: true,
  vacationStartDate: true,
  vacationEndDate: true,
  wtfDays: true,
  notes: true,
  createdAt: true,
  user: {
    select: {
      firstName: true,
      lastName: true,
      rank: { select: { code: true, name: true } },
      base: { select: { airportCode: true, name: true } },
    },
  },
  _count: { select: { matches: true } },
} as const;

export async function createTrade(userId: string, data: CreateTradeInput) {
  return prisma.trade.create({
    data: {
      userId,
      tradeType: data.tradeType,
      scheduleTripId: data.scheduleTripId,
      destination: data.destination,
      departureDate: data.departureDate,
      reportTime: data.reportTime,
      tripNumber: data.tripNumber,
      flightNumber: data.flightNumber,
      aircraftTypeCode: data.aircraftTypeCode,
      departureTime: data.departureTime,
      arrivalTime: data.arrivalTime,
      flyingTime: data.flyingTime,
      layoverDuration: data.layoverDuration,
      creditHours: data.creditHours,
      blockHours: data.blockHours,
      tafb: data.tafb,
      desiredDestinations: data.desiredDestinations,
      wtfDays: data.wtfDays,
      preferMinCredit: data.preferMinCredit,
      preferMaxCredit: data.preferMaxCredit,
      notes: data.notes,
      vacationStartDate: data.vacationStartDate,
      vacationEndDate: data.vacationEndDate,
      desiredVacationStart: data.desiredVacationStart,
      desiredVacationEnd: data.desiredVacationEnd,
    },
    include: { user: { include: { rank: true, base: true } } },
  });
}

export async function findTradeById(id: string) {
  return prisma.trade.findUnique({
    where: { id },
    include: {
      user: {
        include: { rank: true, base: true, qualifications: { include: { aircraftType: true } } },
      },
    },
  });
}

export async function findTradesByUserId(userId: string, status?: TradeStatus) {
  const where: { userId: string; status?: TradeStatus } = { userId };
  if (status) where.status = status;
  return prisma.trade.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: tradeWithUserSelect,
  });
}

/** Trades with scheduleTrip (legs, layovers) for My Flights trip cards. Excludes CANCELLED by default. */
export async function findTradesByUserIdWithScheduleTrip(
  userId: string,
  options?: { status?: TradeStatus; includeCancelled?: boolean }
) {
  const where: { userId: string; status?: TradeStatus | { not: TradeStatus } } = { userId };
  if (options?.status) where.status = options.status;
  else if (options?.includeCancelled !== true) where.status = { not: "CANCELLED" };
  return prisma.trade.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          rank: { select: { code: true, name: true } },
          base: { select: { airportCode: true, name: true } },
        },
      },
      scheduleTrip: {
        include: {
          legs: { orderBy: { legOrder: "asc" } },
          layovers: { orderBy: { afterLegOrder: "asc" } },
        },
      },
      _count: { select: { matches: true } },
    },
  });
}

export async function findCandidateTradesForMatching(excludeUserId: string, airlineId: string, baseId: string) {
  return prisma.trade.findMany({
    where: {
      status: "OPEN",
      userId: { not: excludeUserId },
      user: { airlineId, baseId },
    },
    include: {
      user: {
        include: { rank: true, base: true, qualifications: { include: { aircraftType: true } } },
      },
    },
  });
}

/** OPEN trades from other users at same base, with scheduleTrip for board cards. */
export async function findTradesForBoard(currentUserId: string, baseId: string) {
  return prisma.trade.findMany({
    where: {
      status: "OPEN",
      userId: { not: currentUserId },
      user: { baseId },
      tradeType: "FLIGHT_SWAP",
    },
    take: 20,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      tradeType: true,
      status: true,
      scheduleTripId: true,
      tripNumber: true,
      flightNumber: true,
      aircraftTypeCode: true,
      destination: true,
      departureDate: true,
      reportTime: true,
      departureTime: true,
      arrivalTime: true,
      flyingTime: true,
      creditHours: true,
      tafb: true,
      user: {
        select: {
          rank: { select: { name: true, code: true } },
          base: { select: { name: true, airportCode: true } },
        },
      },
      scheduleTrip: {
        select: {
          legs: {
            orderBy: { legOrder: "asc" },
            select: {
              legOrder: true,
              flightNumber: true,
              departureAirport: true,
              arrivalAirport: true,
              departureTime: true,
              arrivalTime: true,
            },
          },
          layovers: {
            orderBy: { afterLegOrder: "asc" },
            select: { airport: true, durationDecimal: true, afterLegOrder: true },
          },
        },
      },
      _count: { select: { matches: true } },
    },
  });
}

export async function findTradesBrowse(
  currentUserId: string,
  filters: {
    destination?: string;
    dateFrom?: Date;
    dateTo?: Date;
    tradeType?: "FLIGHT_SWAP" | "VACATION_SWAP";
    aircraftType?: string;
    airlineId: string;
    baseId: string;
  },
  page: number,
  limit: number
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where: Record<string, unknown> = {
    status: "OPEN",
    userId: { not: currentUserId },
    user: { airlineId: filters.airlineId, baseId: filters.baseId },
    OR: [
      { tradeType: "FLIGHT_SWAP", departureDate: { gte: today } },
      { tradeType: "VACATION_SWAP", vacationStartDate: { gte: today } },
      { tradeType: "VACATION_SWAP", vacationStartDate: null, departureDate: { gte: today } },
    ],
  };
  if (filters.destination) where.destination = filters.destination;
  if (filters.tradeType) where.tradeType = filters.tradeType;
  if (filters.aircraftType) where.aircraftTypeCode = filters.aircraftType;
  if (filters.dateFrom || filters.dateTo) {
    where.departureDate = {};
    if (filters.dateFrom) (where.departureDate as Record<string, Date>).gte = filters.dateFrom;
    if (filters.dateTo) (where.departureDate as Record<string, Date>).lte = filters.dateTo;
  }
  const [items, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      orderBy: { departureDate: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      select: tradeWithUserSelect,
    }),
    prisma.trade.count({ where }),
  ]);
  return { items, total };
}

export async function updateTradeStatus(id: string, status: TradeStatus) {
  return prisma.trade.update({ where: { id }, data: { status } });
}

export async function deleteTrade(id: string) {
  return prisma.trade.delete({ where: { id } });
}
