import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { findUserById } from "@/repositories/userRepository";
import * as tradeRepo from "@/repositories/tradeRepository";
import { createTradeAndMatch } from "@/services/trade/tradeService";
import { validateCreateTradeInput } from "@/services/trade/tradeValidator";
import type { CreateTradeInput } from "@/types/trade";
import { TRADE_PAGE_SIZE } from "@/config/constants";
import { prisma } from "@/lib/prisma";
import { isTradeExpired } from "@/lib/swapExpiry";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }
  const user = await findUserById(session.user.id);
  if (!user) {
    return NextResponse.json({ data: null, error: "Not found", message: "User not found" }, { status: 404 });
  }
  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "1";
  const status = searchParams.get("status") as import("@/types/enums").TradeStatus | undefined;
  const now = new Date();

  if (mine) {
    const items = await tradeRepo.findTradesByUserId(session.user.id, status);
    const list = items
      .filter((t) => !isTradeExpired(t, now))
      .map((t) => ({ ...t, matchCount: t._count.matches, _count: undefined }));
    return NextResponse.json({ data: { items: list, total: list.length }, error: null, message: null });
  }

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? String(TRADE_PAGE_SIZE), 10));
  const dateFrom = searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom")!) : undefined;
  const dateTo = searchParams.get("dateTo") ? new Date(searchParams.get("dateTo")!) : undefined;
  const tradeType = searchParams.get("tradeType") as "FLIGHT_SWAP" | "VACATION_SWAP" | undefined;
  const destination = searchParams.get("destination") ?? undefined;
  const aircraftType = searchParams.get("aircraftType") ?? undefined;

  const result = await tradeRepo.findTradesBrowse(
    session.user.id,
    { airlineId: user.airlineId, baseId: user.baseId, dateFrom, dateTo, tradeType, destination, aircraftType },
    page,
    limit
  );
  const items = result.items
    .filter((t) => !isTradeExpired(t, now))
    .map((t) => ({
    ...t,
    matchCount: t._count.matches,
    _count: undefined,
  }));
  return NextResponse.json({ data: { items, total: result.total }, error: null, message: null });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ data: null, error: "Bad request", message: "Invalid JSON" }, { status: 400 });
  }
  const raw = body as any;
  const validationErrors = validateCreateTradeInput(raw as CreateTradeInput);
  if (validationErrors.length > 0) {
    return NextResponse.json(
      { data: null, error: "Validation failed", message: validationErrors[0].message, details: validationErrors },
      { status: 422 }
    );
  }

  let input: CreateTradeInput;

  if (raw.tradeType === "VACATION_SWAP") {
    input = {
      tradeType: "VACATION_SWAP",
      destination: "N/A",
      departureDate: new Date(raw.vacationStartDate),
      reportTime: "00.00Z",
      desiredDestinations: raw.desiredDestinations ?? [],
      wtfDays: Array.isArray(raw.wtfDays) ? raw.wtfDays : [],
      notes: raw.notes,
      vacationStartDate: new Date(raw.vacationStartDate),
      vacationEndDate: new Date(raw.vacationEndDate),
      desiredVacationStart: raw.desiredVacationStart ? new Date(raw.desiredVacationStart) : undefined,
      desiredVacationEnd: raw.desiredVacationEnd ? new Date(raw.desiredVacationEnd) : undefined,
    };
  } else if (raw.scheduleTripId) {
    await prisma.trade.updateMany({
      where: { scheduleTripId: raw.scheduleTripId as string, status: "CANCELLED" },
      data: { scheduleTripId: null },
    });
    const scheduleTrip = await prisma.scheduleTrip.findUnique({
      where: { id: raw.scheduleTripId as string },
      include: {
        legs: { orderBy: { legOrder: "asc" } },
        layovers: { orderBy: { afterLegOrder: "asc" } },
      },
    });
    if (!scheduleTrip) {
      return NextResponse.json(
        { data: null, error: "Not found", message: "Schedule trip not found" },
        { status: 404 }
      );
    }
    const firstLeg = scheduleTrip.legs[0];
    const lastLeg = scheduleTrip.legs[scheduleTrip.legs.length - 1] ?? firstLeg;
    const destination =
      lastLeg?.arrivalAirport ?? firstLeg?.arrivalAirport ?? scheduleTrip.tripNumber;

    input = {
      tradeType: "FLIGHT_SWAP",
      scheduleTripId: scheduleTrip.id,
      tripNumber: scheduleTrip.tripNumber,
      flightNumber: firstLeg?.flightNumber,
      aircraftTypeCode: firstLeg?.aircraftTypeCode,
      destination,
      departureDate: scheduleTrip.startDate,
      reportTime: scheduleTrip.reportTime ?? "00.00Z",
      departureTime: firstLeg?.departureTime,
      arrivalTime: lastLeg?.arrivalTime,
      flyingTime: lastLeg?.flyingTime ?? undefined,
      creditHours: scheduleTrip.creditHours,
      blockHours: scheduleTrip.blockHours,
      tafb: scheduleTrip.tafb,
      desiredDestinations: raw.desiredDestinations ?? [],
      wtfDays: Array.isArray(raw.wtfDays) ? raw.wtfDays : [],
      notes: raw.notes,
    };
  } else {
    input = {
      tradeType: "FLIGHT_SWAP",
      tripNumber: raw.tripNumber,
      flightNumber: raw.flightNumber,
      aircraftTypeCode: raw.aircraftTypeCode,
      destination: raw.destination,
      departureDate: new Date(raw.departureDate),
      reportTime: raw.reportTime,
      creditHours: raw.creditHours ? Number(raw.creditHours) : undefined,
      blockHours: raw.blockHours ? Number(raw.blockHours) : undefined,
      tafb: raw.tafb ? Number(raw.tafb) : undefined,
      desiredDestinations: raw.desiredDestinations ?? [],
      wtfDays: Array.isArray(raw.wtfDays) ? raw.wtfDays : [],
      notes: raw.notes,
    };
  }

  const { trade, matches } = await createTradeAndMatch(session.user.id, input);
  return NextResponse.json({ data: { trade, matches }, error: null, message: "Trade created" });
}
