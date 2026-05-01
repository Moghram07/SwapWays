import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import * as tradeRepo from "@/repositories/tradeRepository";
import { createTradeAndMatch } from "@/services/trade/tradeService";
import { validateCreateTradeInput } from "@/services/trade/tradeValidator";
import type { CreateTradeInput } from "@/types/trade";
import { TRADE_PAGE_SIZE } from "@/config/constants";
import { prisma } from "@/lib/prisma";
import { isTradeExpired } from "@/lib/swapExpiry";
import { withTiming } from "@/lib/apiTimer";
import { requireSameOrigin } from "@/lib/csrf";
import { withTimeout } from "@/lib/withTimeout";

export async function GET(request: Request) {
  const timer = withTiming("GET /api/trades");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return timer.end(NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 }));
  }
  try {
    const user = await withTimeout(
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { airlineId: true, baseId: true },
      }),
      4000,
      "trades user query"
    );
    if (!user) {
      return timer.end(NextResponse.json({ data: null, error: "Not found", message: "User not found" }, { status: 404 }));
    }
    const { searchParams } = new URL(request.url);
    const mine = searchParams.get("mine") === "1";
    const compact = searchParams.get("compact") === "1";
    const excludeCancelled = searchParams.get("excludeCancelled") === "1";
    const mineTradeType = searchParams.get("tradeType") as "FLIGHT_SWAP" | "VACATION_SWAP" | null;
    const status = searchParams.get("status") as import("@/types/enums").TradeStatus | undefined;
    const mineScope = searchParams.get("scope") ?? "active";
    const now = new Date();

    if (mine) {
      if (compact) {
        if (mineScope !== "active" && mineScope !== "history") {
          return timer.end(
            NextResponse.json({ data: null, error: "Error", message: "Use scope=active or scope=history" }, { status: 400 })
          );
        }
        const items = await withTimeout(
          prisma.trade.findMany({
            where: {
              userId: session.user.id,
              ...(mineTradeType ? { tradeType: mineTradeType } : {}),
              ...(mineScope === "history"
                ? { status: { in: ["EXPIRED", "CANCELLED", "COMPLETED"] } }
                : excludeCancelled
                  ? { status: { notIn: ["CANCELLED", "EXPIRED"] } }
                  : {}),
            },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              status: true,
              tradeType: true,
              scheduleTripId: true,
              departureDate: true,
              reportTime: true,
              vacationStartDate: true,
              vacationEndDate: true,
              desiredDestinations: true,
              createdAt: true,
            },
          }),
          4000,
          "trades compact query"
        );
        let list =
          mineScope === "history" ? items : items.filter((t) => !isTradeExpired(t, now));
        if (mineScope === "history" && mineTradeType === "VACATION_SWAP") {
          list = list.filter((t) => Boolean(t.vacationStartDate || t.vacationEndDate));
        }
        return timer.end(NextResponse.json({ data: { items: list, total: list.length }, error: null, message: null }));
      }

      const items = await withTimeout(tradeRepo.findTradesByUserId(session.user.id, status), 4000, "trades mine query");
      const list = items
        .filter((t) => !isTradeExpired(t, now))
        .map((t) => ({ ...t, matchCount: t._count.matches, _count: undefined }));
      return timer.end(NextResponse.json({ data: { items: list, total: list.length }, error: null, message: null }));
    }

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? String(TRADE_PAGE_SIZE), 10));
    const cursor = searchParams.get("cursor");
    const dateFrom = searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom")!) : undefined;
    const dateTo = searchParams.get("dateTo") ? new Date(searchParams.get("dateTo")!) : undefined;
    const tradeType = searchParams.get("tradeType") as "FLIGHT_SWAP" | "VACATION_SWAP" | undefined;
    const destination = searchParams.get("destination") ?? undefined;
    const aircraftType = searchParams.get("aircraftType") ?? undefined;

    const result = await withTimeout(
      tradeRepo.findTradesBrowse(
        session.user.id,
        { airlineId: user.airlineId, baseId: user.baseId, dateFrom, dateTo, tradeType, destination, aircraftType },
        page,
        limit,
        { includeTotal: false }
      ),
      4000,
      "trades browse query"
    );
    const items = result.items
      .filter((t) => !isTradeExpired(t, now))
      .map((t) => ({
        ...t,
        matchCount: t._count.matches,
        _count: undefined,
      }));
    const paged = cursor
      ? (() => {
          const startIndex = items.findIndex((item) => item.id === cursor) + 1;
          const slice = items.slice(startIndex, startIndex + limit + 1);
          const hasMore = slice.length > limit;
          const data = hasMore ? slice.slice(0, limit) : slice;
          return { items: data, hasMore, nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null };
        })()
      : { items, hasMore: false, nextCursor: null };
    return timer.end(NextResponse.json({ data: { ...paged, total: result.total ?? items.length }, error: null, message: null }));
  } catch (error) {
    console.error("[api/trades] degraded response due to transient DB failure", error);
    return timer.end(
      NextResponse.json(
        {
          data: { items: [], total: 0, hasMore: false, nextCursor: null },
          error: "ServiceUnavailable",
          message: "Trades are temporarily unavailable. Please refresh in a moment.",
        },
        { status: 200 }
      )
    );
  }
}

export async function POST(request: Request) {
  const timer = withTiming("POST /api/trades");
  const csrfError = requireSameOrigin(request);
  if (csrfError) return timer.end(csrfError);

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return timer.end(NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 }));
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return timer.end(NextResponse.json({ data: null, error: "Bad request", message: "Invalid JSON" }, { status: 400 }));
  }
  const raw = body as Partial<CreateTradeInput> & {
    tradeType?: "FLIGHT_SWAP" | "VACATION_SWAP";
    scheduleTripId?: string;
    vacationStartDate?: string;
    vacationEndDate?: string;
    desiredDestinations?: string[];
    wtfDays?: number[];
    notes?: string;
    desiredVacationStart?: string;
    desiredVacationEnd?: string;
  };
  const validationErrors = validateCreateTradeInput(raw as CreateTradeInput);
  if (validationErrors.length > 0) {
    return timer.end(NextResponse.json(
      { data: null, error: "Validation failed", message: validationErrors[0].message, details: validationErrors },
      { status: 422 }
    ));
  }

  let input: CreateTradeInput;

  if (raw.tradeType === "VACATION_SWAP") {
    if (!raw.vacationStartDate || !raw.vacationEndDate) {
      return timer.end(NextResponse.json(
        { data: null, error: "Validation failed", message: "Vacation start/end dates are required." },
        { status: 422 }
      ));
    }
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
      select: {
        id: true,
        schedule: {
          select: { userId: true },
        },
        tripNumber: true,
        startDate: true,
        reportTime: true,
        creditHours: true,
        blockHours: true,
        tafb: true,
        legs: {
          orderBy: { legOrder: "asc" },
          select: {
            legOrder: true,
            flightNumber: true,
            aircraftTypeCode: true,
            departureTime: true,
            arrivalTime: true,
            arrivalAirport: true,
            flyingTime: true,
          },
        },
        layovers: { orderBy: { afterLegOrder: "asc" }, select: { id: true } },
      },
    });
    if (!scheduleTrip) {
      return timer.end(NextResponse.json(
        { data: null, error: "Not found", message: "Schedule trip not found" },
        { status: 404 }
      ));
    }
    if (scheduleTrip.schedule.userId !== session.user.id) {
      return timer.end(
        NextResponse.json(
          { data: null, error: "Forbidden", message: "You can only post trades from your own schedule trips" },
          { status: 403 }
        )
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
      destination: raw.destination as string,
      departureDate: new Date(raw.departureDate as Date | string),
      reportTime: raw.reportTime as string,
      creditHours: raw.creditHours ? Number(raw.creditHours) : undefined,
      blockHours: raw.blockHours ? Number(raw.blockHours) : undefined,
      tafb: raw.tafb ? Number(raw.tafb) : undefined,
      desiredDestinations: raw.desiredDestinations ?? [],
      wtfDays: Array.isArray(raw.wtfDays) ? raw.wtfDays : [],
      notes: raw.notes,
    };
  }

  const { trade, matches } = await createTradeAndMatch(session.user.id, input);
  return timer.end(NextResponse.json({ data: { trade, matches }, error: null, message: "Trade created" }));
}
