/**
 * Resolve leg dates from pairing data only (no calendar grid).
 * Uses trip order from Row 3 (chronological) + first-leg day-of-week + month/year.
 */

import type { ParsedPairing, ParsedPairingLeg } from "./pairingParser";
import { scheduleTimeToMinutes } from "../../utils/timeUtils";
import type { ParsedTrip, ParsedLeg } from "../../types/schedule";

const DOW_INDEX: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

function dayCodeToIndex(code: string): number {
  const idx = DOW_INDEX[code.toUpperCase()];
  return idx ?? -1;
}

/** Create a date at noon UTC for a calendar day (avoids timezone shift when using toISOString()). */
function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

/**
 * Find the first date on or after startFrom that has getUTCDay() === targetDayIndex,
 * and that is on or before searchLimit. Returns null if no match before limit.
 */
function findNextMatchingDay(
  startFrom: Date,
  targetDayIndex: number,
  searchLimit: Date
): Date | null {
  const result = new Date(startFrom);
  for (let i = 0; i < 14; i++) {
    if (result.getUTCDay() === targetDayIndex) {
      return result <= searchLimit ? new Date(result) : null;
    }
    result.setUTCDate(result.getUTCDate() + 1);
  }
  return null;
}

/**
 * Advance to the date of the given day-of-week (UTC).
 * If currentDate is already that day, return it (same-day leg).
 * Otherwise advance to the next occurrence of that day.
 */
/**
 * Advance to the date of the given day-of-week (UTC). Used for leg dates within a trip;
 * no search limit so that return legs in the next month (e.g. Apr 2) resolve correctly.
 */
function advanceToDay(currentDate: Date, targetDayIndex: number): Date {
  if (currentDate.getUTCDay() === targetDayIndex) return new Date(currentDate);
  const next = new Date(currentDate);
  next.setUTCDate(next.getUTCDate() + 1);
  for (let i = 0; i < 7; i++) {
    if (next.getUTCDay() === targetDayIndex) return next;
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

/**
 * How many calendar days the trip spans (for earliestAllowed for next trip).
 */
function calculateTripDays(pairing: ParsedPairing): number {
  if (pairing.legs.length === 0) return 1;
  const firstDayIndex = dayCodeToIndex(pairing.legs[0]!.dayOfWeek);
  const lastLeg = pairing.legs[pairing.legs.length - 1]!;
  const lastDayIndex = dayCodeToIndex(lastLeg.dayOfWeek);
  let days = (lastDayIndex - firstDayIndex + 7) % 7 + 1;
  const depMins = scheduleTimeToMinutes(lastLeg.departureTime);
  const arrMins = scheduleTimeToMinutes(lastLeg.arrivalTime);
  if (arrMins < depMins) days += 1;
  return Math.max(1, days);
}

/** Arrival is next calendar day if arrival time < departure time (UTC date). */
export function resolveArrivalDate(
  departureDate: Date,
  departureTime: string,
  arrivalTime: string
): Date {
  const depMins = scheduleTimeToMinutes(departureTime);
  const arrMins = scheduleTimeToMinutes(arrivalTime);
  const arrDate = new Date(departureDate);
  if (arrMins < depMins) arrDate.setUTCDate(arrDate.getUTCDate() + 1);
  return arrDate;
}

/**
 * Resolve each leg's departure/arrival date within a trip.
 * First leg departs on startDate; later legs advance to match their day-of-week.
 */
function resolveLegDates(pairing: ParsedPairing, startDate: Date, instanceId: string): ParsedTrip {
  const legs: ParsedLeg[] = [];
  let currentDepDate = new Date(startDate);

  for (let i = 0; i < pairing.legs.length; i++) {
    const leg = pairing.legs[i]! as ParsedPairingLeg;
    const legDayIndex = dayCodeToIndex(leg.dayOfWeek);

    if (i === 0) {
      currentDepDate = new Date(startDate);
    } else {
      currentDepDate = advanceToDay(currentDepDate, legDayIndex);
    }

    const arrivalDate = resolveArrivalDate(
      currentDepDate,
      leg.departureTime,
      leg.arrivalTime
    );

    legs.push({
      legOrder: leg.legOrder,
      dayOfWeek: leg.dayOfWeek,
      flightNumber: leg.flightNumber,
      aircraftTypeCode: leg.aircraftCode,
      departureDate: new Date(currentDepDate),
      departureTime: leg.departureTime,
      departureAirport: leg.departureAirport,
      arrivalDate,
      arrivalTime: leg.arrivalTime,
      arrivalAirport: leg.arrivalAirport,
      flyingTimeRaw: leg.flyingTimeRaw,
      flyingTime: leg.flyingTimeDecimal,
      layoverDuration: leg.layoverDurationDecimal ?? undefined,
      layoverAirport: leg.layoverAirport,
    });
  }

  const reportHours =
    (() => {
      const t = pairing.reportTime.replace("Z", "").replace(":", ".");
      const [h, m] = t.split(".");
      return (parseInt(h ?? "0", 10) || 0) + (parseInt(m ?? "0", 10) || 0) / 60;
    })();
  const reportDate =
    reportHours >= 20
      ? (() => {
          const d = new Date(startDate);
          d.setUTCDate(d.getUTCDate() - 1);
          return d;
        })()
      : new Date(startDate);

  return {
    tripNumber: pairing.tripNumber,
    instanceId,
    reportTime: pairing.reportTime,
    reportDate,
    legs,
    layovers: pairing.layovers?.length ? pairing.layovers : undefined,
    creditHours: pairing.creditHours,
    blockHours: pairing.blockHours,
    tafb: pairing.tafb,
  };
}

/**
 * Resolve dates for all trips using trip order (from grid when available),
 * first-leg day-of-week, roster start day, and search limit into next month.
 */
export function resolveAllTripDates(
  pairings: ParsedPairing[],
  tripOrder: string[],
  month: number,
  year: number,
  rosterStartDay: number = 1
): ParsedTrip[] {
  const pairingMap = new Map<string, ParsedPairing>();
  for (const p of pairings) {
    if (!pairingMap.has(p.tripNumber)) pairingMap.set(p.tripNumber, p);
  }

  const resolvedTripNumbers = new Set<string>();
  const instanceCount = new Map<string, number>();
  const resolvedTrips: ParsedTrip[] = [];
  const earliestAllowed = new Date(Date.UTC(year, month - 1, rosterStartDay, 12, 0, 0, 0));

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const searchLimit = new Date(Date.UTC(nextYear, nextMonth - 1, 7, 23, 59, 59, 999));

  for (const tripNum of tripOrder) {
    const pairing = pairingMap.get(tripNum);
    if (!pairing?.legs.length) continue;

    const firstLegDay = pairing.legs[0]!.dayOfWeek;
    const targetDayIndex = dayCodeToIndex(firstLegDay);
    if (targetDayIndex < 0) continue;

    const startDate = findNextMatchingDay(earliestAllowed, targetDayIndex, searchLimit);
    if (!startDate) continue;

    const count = (instanceCount.get(tripNum) ?? 0) + 1;
    instanceCount.set(tripNum, count);
    const instanceId = count > 1 ? `${tripNum}_${count}` : tripNum;
    resolvedTrips.push(resolveLegDates(pairing, startDate, instanceId));
    resolvedTripNumbers.add(tripNum);

    const tripDays = calculateTripDays(pairing);
    earliestAllowed.setTime(startDate.getTime());
    earliestAllowed.setUTCDate(earliestAllowed.getUTCDate() + tripDays - 1);
  }

  for (const pairing of pairings) {
    if (resolvedTripNumbers.has(pairing.tripNumber)) continue;
    const fallback = utcDate(year, month, rosterStartDay);
    const idx = dayCodeToIndex(pairing.legs[0]?.dayOfWeek ?? "SU");
    const fallbackStart =
      findNextMatchingDay(fallback, idx >= 0 ? idx : 0, searchLimit) ?? fallback;
    const count = (instanceCount.get(pairing.tripNumber) ?? 0) + 1;
    instanceCount.set(pairing.tripNumber, count);
    const instanceId = count > 1 ? `${pairing.tripNumber}_${count}` : pairing.tripNumber;
    resolvedTrips.push(resolveLegDates(pairing, fallbackStart, instanceId));
  }
  return resolvedTrips;
}
