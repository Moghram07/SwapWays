import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { findScheduleByUserAndMonth } from "@/repositories/scheduleRepository";
import { findTradesByUserId } from "@/repositories/tradeRepository";
import { findMatchesByUserId } from "@/repositories/matchRepository";
import { tripToCardData } from "@/utils/tripCardData";
import { buildCalendarData } from "@/utils/calendarBuilder";

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: "schedule" | "trade" | "swap";
  flightNumber?: string;
  origin?: string;
  destination?: string;
  aircraft?: string;
  reportTime?: string;
  tradeId?: string;
  legId?: string;
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");
  const yearParam = searchParams.get("year");

  const now = new Date();
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

  if (Number.isNaN(month) || Number.isNaN(year) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid month or year" }, { status: 400 });
  }

  const userId = session.user.id;
  const events: CalendarEvent[] = [];

  const [schedule, trades, matches] = await Promise.all([
    findScheduleByUserAndMonth(userId, month, year),
    findTradesByUserId(userId),
    findMatchesByUserId(userId),
  ]);

  const acceptedMatches = matches.filter((m) => m.status === "ACCEPTED");

  const airlineCode = (schedule as { user?: { airline?: { code: string } } })?.user?.airline?.code ?? "SV";

  let tripCards: import("@/types/tripCard").TripCardData[] = [];
  if (schedule?.trips) {
    tripCards = schedule.trips.map((trip) => {
      const card = tripToCardData({
        tripNumber: trip.tripNumber,
        instanceId: trip.instanceId,
        scheduleTripId: trip.id,
        reportTime: trip.reportTime ?? undefined,
        legs: trip.legs.map((leg) => ({
          legOrder: leg.legOrder,
          flightNumber: leg.flightNumber,
          aircraftTypeCode: leg.aircraftTypeCode,
          dayOfWeek: leg.dayOfWeek ?? "",
          departureDate: leg.departureDate,
          departureTime: leg.departureTime,
          departureAirport: leg.departureAirport,
          arrivalDate: leg.arrivalDate,
          arrivalAirport: leg.arrivalAirport,
          arrivalTime: leg.arrivalTime,
          flyingTime: leg.flyingTime,
        })),
        layovers: (trip as { layovers?: { airport: string; durationDecimal: number; afterLegOrder: number }[] }).layovers?.map((lo) => ({
          airport: lo.airport,
          durationDecimal: lo.durationDecimal,
          afterLegOrder: lo.afterLegOrder,
        })) ?? [],
        creditHours: trip.creditHours,
        blockHours: trip.blockHours,
        tafb: trip.tafb,
        tripType: trip.tripType,
        routeType: trip.routeType === "DOMESTIC" ? "domestic" : "international",
      });
      return { ...card, airlineCode };
    });
  }

  const days = buildCalendarData(tripCards, month, year);
  const daysSerialized = days.map((day) => ({
    ...day,
    date: day.date.toISOString(),
  }));

  for (const trade of trades) {
    if (trade.tradeType !== "FLIGHT_SWAP") continue;
    const dep = trade.departureDate ?? null;
    if (dep == null) continue;
    const d = new Date(dep);
    if (d.getMonth() !== month - 1 || d.getFullYear() !== year) continue;
    const flightLabel = trade.flightNumber ? `SV${trade.flightNumber}` : "Trade";
    events.push({
      id: `trade-${trade.id}`,
      title: `Trade: → ${trade.destination ?? "—"}`,
      date: d.toISOString().slice(0, 10),
      type: "trade",
      flightNumber: trade.flightNumber ?? undefined,
      destination: trade.destination ?? undefined,
      aircraft: trade.aircraftTypeCode ?? undefined,
      reportTime: trade.reportTime ?? undefined,
      tradeId: trade.id,
    });
  }

  for (const match of acceptedMatches) {
    if (match.receiverId !== userId) continue;
    const tradeToShow = match.trade;
    if (!tradeToShow) continue;
    const dep = tradeToShow.departureDate ?? null;
    if (dep == null) continue;
    const d = new Date(dep);
    if (d.getMonth() !== month - 1 || d.getFullYear() !== year) continue;
    events.push({
      id: `swap-${match.id}`,
      title: `Swapped in: → ${tradeToShow.destination ?? "—"}`,
      date: d.toISOString().slice(0, 10),
      type: "swap",
      flightNumber: tradeToShow.flightNumber ?? undefined,
      destination: tradeToShow.destination ?? undefined,
      aircraft: tradeToShow.aircraftTypeCode ?? undefined,
      reportTime: tradeToShow.reportTime ?? undefined,
      tradeId: tradeToShow.id,
    });
  }

  events.sort((a, b) => a.date.localeCompare(b.date) || (a.reportTime ?? "").localeCompare(b.reportTime ?? ""));

  return NextResponse.json({
    data: { events, month, year, days: daysSerialized },
    error: null,
  });
}
