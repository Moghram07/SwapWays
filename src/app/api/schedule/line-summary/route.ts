import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { LineType } from "@/types/enums";

const US_DESTINATIONS = new Set(["JFK", "IAD"]);
const CHINA_DESTINATIONS = new Set(["PKX", "CAN"]);
const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function unauthorized() {
  return NextResponse.json(
    { data: null, error: "Unauthorized", message: "Please sign in" },
    { status: 401 }
  );
}

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

function isReserveTrip(tripNumber: string): boolean {
  const normalized = tripNumber.toUpperCase().trim();
  return normalized === "RESERVE" || normalized === "RR" || normalized.startsWith("RR");
}

function collectDaysInRange(start: Date, end: Date): number[] {
  const result: number[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (cursor <= last) {
    result.push(cursor.getUTCDate());
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

function findLongestConsecutiveRange(days: number[]): { start: number; end: number } {
  if (days.length === 0) return { start: 0, end: 0 };

  const sorted = [...new Set(days)].sort((a, b) => a - b);
  let bestStart = sorted[0];
  let bestEnd = sorted[0];
  let bestLength = 1;
  let currentStart = sorted[0];
  let currentLength = 1;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      currentLength++;
      if (currentLength > bestLength) {
        bestLength = currentLength;
        bestStart = currentStart;
        bestEnd = sorted[i];
      }
    } else {
      currentStart = sorted[i];
      currentLength = 1;
    }
  }

  return { start: bestStart, end: bestEnd };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const schedule = await prisma.schedule.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      trips: {
        include: {
          legs: true,
          layovers: true,
        },
      },
    },
  });

  if (!schedule) return json(null);

  const allDestinations = new Set<string>();
  const reserveDaysSet = new Set<number>();
  const dutyDays = new Set<number>();

  for (const trip of schedule.trips) {
    const reserveTrip = isReserveTrip(trip.tripNumber);

    if (reserveTrip) {
      for (const day of collectDaysInRange(new Date(trip.startDate), new Date(trip.endDate))) {
        reserveDaysSet.add(day);
        dutyDays.add(day);
      }
    }

    for (const leg of trip.legs) {
      allDestinations.add(leg.departureAirport.toUpperCase());
      allDestinations.add(leg.arrivalAirport.toUpperCase());
      dutyDays.add(new Date(leg.departureDate).getUTCDate());
      dutyDays.add(new Date(leg.arrivalDate).getUTCDate());
    }
  }

  const hasTrips = schedule.trips.length > 0;
  const isReserveLine = hasTrips && schedule.trips.every((trip) => isReserveTrip(trip.tripNumber));

  let lineType: LineType = "NORMAL";
  if (isReserveLine) {
    lineType = "RESERVE_LINE";
  } else if ([...allDestinations].some((code) => US_DESTINATIONS.has(code))) {
    lineType = "US_LINE";
  } else if ([...allDestinations].some((code) => CHINA_DESTINATIONS.has(code))) {
    lineType = "CHINA_LINE";
  }

  const daysInMonth = new Date(schedule.year, schedule.month, 0).getDate();
  const daysOff: number[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    if (!dutyDays.has(d)) daysOff.push(d);
  }
  const { start: daysOffStart, end: daysOffEnd } = findLongestConsecutiveRange(daysOff);

  const layoverByDestination = new Map<string, number>();
  for (const layover of schedule.trips.flatMap((trip) => trip.layovers)) {
    const code = layover.airport.toUpperCase();
    const hours = Math.round(layover.durationDecimal);
    const existing = layoverByDestination.get(code) ?? 0;
    layoverByDestination.set(code, Math.max(existing, hours));
  }

  const layovers = [...layoverByDestination.entries()].map(([destination, hours]) => ({
    destination,
    hours,
  }));

  return json({
    lineNumber: schedule.lineNumber,
    lineType,
    month: MONTH_NAMES[schedule.month] ?? "Jan",
    year: schedule.year,
    daysOffStart,
    daysOffEnd,
    hasReserve: reserveDaysSet.size > 0,
    reserveDays: [...reserveDaysSet].sort((a, b) => a - b),
    layovers,
    scheduleId: schedule.id,
  });
}
