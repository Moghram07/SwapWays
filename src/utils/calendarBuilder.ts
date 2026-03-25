import type { TripCardData, TripCardLeg } from "@/types/tripCard";
import type { CalendarDayData, CalendarLegInfo, CalendarTripEvent } from "@/types/calendar";
import type { TripDayRole } from "@/types/calendar";
import { getAirportCity } from "@/utils/airportNames";
import { zuluToLocal } from "@/utils/airportTimezones";
import { getUniqueDestinations, getTripTypeInfo } from "@/utils/tripClassifier";
import { scheduleTimeToMinutes } from "@/utils/timeUtils";

export type { CalendarDayData, CalendarTripEvent } from "@/types/calendar";

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function dateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function findCalendarDay(
  calendar: CalendarDayData[],
  date: Date
): CalendarDayData | undefined {
  const d = date.getUTCDate();
  const m = date.getUTCMonth() + 1;
  const y = date.getUTCFullYear();
  return calendar.find(
    (day) =>
      day.dayOfMonth === d && day.month === m && day.year === y
  );
}

function buildTripLabel(
  tripType: TripCardData["tripType"],
  destCity: string
): string {
  switch (tripType) {
    case "LAYOVER":
      return `${destCity} Layover`;
    case "TURNAROUND":
      return `${destCity} Round Trip`;
    case "MULTI_STOP":
      return `Multi-Stop (${destCity})`;
    default:
      return destCity;
  }
}

function formatDuration(decimalHours: number): string {
  const h = Math.floor(decimalHours);
  const m = Math.round((decimalHours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function buildLegInfo(leg: TripCardLeg): CalendarLegInfo {
  const depLocal = zuluToLocal(leg.departureTime, leg.departureAirport);
  const arrLocal = zuluToLocal(leg.arrivalTime, leg.arrivalAirport);
  const depMin = scheduleTimeToMinutes(leg.departureTime);
  const arrMin = scheduleTimeToMinutes(leg.arrivalTime);

  return {
    flightNumber: leg.flightNumber,
    aircraftCode: leg.aircraftCode,
    departureAirport: leg.departureAirport,
    arrivalAirport: leg.arrivalAirport,
    departureTimeZ: leg.departureTime,
    arrivalTimeZ: leg.arrivalTime,
    departureLocal: depLocal.label,
    arrivalLocal: arrLocal.label,
    departureLocalNextDay: depLocal.nextDay,
    duration: formatDuration(leg.flyingTimeDecimal),
    crossesMidnight: arrMin < depMin,
  };
}

/** Returns the layover that covers the given date (by dateKey), or null. */
function getLayoverForDate(
  trip: TripCardData,
  dateKeyStr: string
): { airport: string } | null {
  if (!trip.layovers?.length || !trip.legs?.length) return null;
  for (const layover of trip.layovers) {
    const afterLegNumber = layover.afterLegNumber ?? 0;
    const arrLegIdx = afterLegNumber - 1;
    const depLegIdx = afterLegNumber;
    if (arrLegIdx < 0 || depLegIdx >= trip.legs.length) continue;
    const arrLeg = trip.legs[arrLegIdx];
    const depLeg = trip.legs[depLegIdx];
    const startDate = arrLeg.arrivalDate ?? arrLeg.departureDate;
    const endDate = depLeg.departureDate;
    if (!startDate || !endDate) continue;
    const startKey = dateKey(startDate);
    const endKey = dateKey(endDate);
    if (dateKeyStr >= startKey && dateKeyStr <= endKey) {
      return { airport: layover.airport };
    }
  }
  return null;
}

/** Returns for each layover the list of date keys for "full layover days" (strictly between arrival and next-leg departure). */
function getFullLayoverDateKeys(trip: TripCardData): { dateKeys: string[]; airport: string }[] {
  const result: { dateKeys: string[]; airport: string }[] = [];
  if (!trip.layovers?.length || !trip.legs?.length) return result;
  for (const layover of trip.layovers) {
    const afterLegNumber = layover.afterLegNumber ?? 0;
    const arrLegIdx = afterLegNumber - 1;
    const depLegIdx = afterLegNumber;
    if (arrLegIdx < 0 || depLegIdx >= trip.legs.length) continue;
    const arrLeg = trip.legs[arrLegIdx];
    const depLeg = trip.legs[depLegIdx];
    const startDate = arrLeg.arrivalDate ?? arrLeg.departureDate;
    const endDate = depLeg.departureDate;
    if (!startDate || !endDate) continue;
    const firstFullDay = new Date(startDate);
    firstFullDay.setUTCDate(firstFullDay.getUTCDate() + 1);
    firstFullDay.setUTCHours(0, 0, 0, 0);
    const lastFullDay = new Date(endDate);
    lastFullDay.setUTCDate(lastFullDay.getUTCDate() - 1);
    lastFullDay.setUTCHours(23, 59, 59, 999);
    if (firstFullDay.getTime() > lastFullDay.getTime()) continue;
    const dateKeys: string[] = [];
    const walk = new Date(firstFullDay);
    while (walk.getTime() <= lastFullDay.getTime()) {
      dateKeys.push(dateKey(walk));
      walk.setUTCDate(walk.getUTCDate() + 1);
    }
    result.push({ dateKeys, airport: layover.airport });
  }
  return result;
}

function determineDayRole(
  legsThisDay: CalendarLegInfo[],
  isFirstDay: boolean,
  isLastDay: boolean,
  trip: TripCardData,
  currentKey: string,
  lastLegDepartureKey: string
): TripDayRole | null {
  const hasLegs = legsThisDay.length > 0;
  const hasLayover = trip.layovers.length > 0;

  if (!hasLegs) {
    if (hasLayover && currentKey < lastLegDepartureKey) return "LAYOVER_DAY";
    return null;
  }

  if (legsThisDay.length >= 3) return "MULTI_STOP";

  if (isFirstDay && isLastDay && (legsThisDay.length === 1 || legsThisDay.length === 2)) {
    return "SAME_DAY";
  }

  if (isFirstDay && !isLastDay) {
    const depMinutes = scheduleTimeToMinutes(legsThisDay[0]!.departureTimeZ);
    if (depMinutes >= 1200) return "DEPART_OVERNIGHT";
    if (hasLayover) return "DEPART_WITH_LAYOVER";
    return "DEPART_ONLY";
  }

  if (isLastDay && !isFirstDay) {
    const depMinutes = scheduleTimeToMinutes(legsThisDay[0]!.departureTimeZ);
    if (depMinutes <= 360) return "RETURN_EARLY";
    return "RETURN_ONLY";
  }

  if (!isFirstDay && !isLastDay && hasLegs) {
    return "RETURN_ONLY";
  }

  return null;
}

function createCalendarGrid(
  trips: TripCardData[],
  primaryMonth: number,
  primaryYear: number
): CalendarDayData[] {
  const calendar: CalendarDayData[] = [];
  const daysInMonth = new Date(primaryYear, primaryMonth, 0).getDate();
  const nextMonth = primaryMonth === 12 ? 1 : primaryMonth + 1;
  const nextYear = primaryMonth === 12 ? primaryYear + 1 : primaryYear;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(Date.UTC(primaryYear, primaryMonth - 1, d));
    calendar.push({
      dayOfMonth: d,
      month: primaryMonth,
      year: primaryYear,
      date,
      weekday: WEEKDAYS[date.getUTCDay()]!,
      isOverflow: false,
      events: [],
    });
  }

  let maxOverflow = 0;
  for (const trip of trips) {
    for (const leg of trip.legs) {
      const arr = leg.arrivalDate ?? leg.departureDate;
      if (
        arr.getUTCMonth() + 1 === nextMonth &&
        arr.getUTCFullYear() === nextYear
      ) {
        maxOverflow = Math.max(maxOverflow, arr.getUTCDate());
      }
      const dep = leg.departureDate;
      if (
        dep.getUTCMonth() + 1 === nextMonth &&
        dep.getUTCFullYear() === nextYear
      ) {
        maxOverflow = Math.max(maxOverflow, dep.getUTCDate());
      }
    }
  }

  for (let d = 1; d <= maxOverflow; d++) {
    const date = new Date(Date.UTC(nextYear, nextMonth - 1, d));
    calendar.push({
      dayOfMonth: d,
      month: nextMonth,
      year: nextYear,
      date,
      weekday: WEEKDAYS[date.getUTCDay()]!,
      isOverflow: true,
      events: [],
    });
  }

  return calendar;
}

function placeTripOnCalendar(
  trip: TripCardData,
  calendar: CalendarDayData[]
): void {
  const typeInfo = getTripTypeInfo(trip.tripType);
  const destCodes = getUniqueDestinations(trip);
  const destCity = destCodes.map((c) => getAirportCity(c)).join(" + ");
  const destCode = destCodes.join(" + ");
  const tripLabel = buildTripLabel(trip.tripType, destCity);

  const legsByDate = new Map<string, CalendarLegInfo[]>();
  const arrivalDates = new Set<string>();

  for (const leg of trip.legs) {
    const depKey = dateKey(leg.departureDate);
    const arrDate = leg.arrivalDate ?? leg.departureDate;
    const arrKey = dateKey(arrDate);

    if (!legsByDate.has(depKey)) legsByDate.set(depKey, []);
    legsByDate.get(depKey)!.push(buildLegInfo(leg));
    arrivalDates.add(arrKey);
  }

  const firstLeg = trip.legs[0];
  const lastLeg = trip.legs[trip.legs.length - 1];
  if (!firstLeg || !lastLeg) return;
  const tripInstanceId =
    trip.scheduleTripId ?? trip.instanceId ?? `${trip.tripNumber}-${dateKey(firstLeg.departureDate)}`;

  const tripStartDate = firstLeg.departureDate;
  const tripEndDate = lastLeg.arrivalDate ?? lastLeg.departureDate;

  const current = new Date(tripStartDate);
  current.setUTCHours(0, 0, 0, 0);
  const endWalk = new Date(tripEndDate);
  endWalk.setUTCHours(23, 59, 59, 999);

  while (current.getTime() <= endWalk.getTime()) {
    const key = dateKey(current);
    const calDay = findCalendarDay(calendar, current);

    if (!calDay) {
      current.setUTCDate(current.getUTCDate() + 1);
      continue;
    }

    const legsThisDay = legsByDate.get(key) ?? [];
    const isFirstDay = key === dateKey(tripStartDate);
    const isLastDay = key === dateKey(tripEndDate);

    const lastLegDepartureKey = dateKey(lastLeg.departureDate);
    const dayRole = determineDayRole(
      legsThisDay,
      isFirstDay,
      isLastDay,
      trip,
      key,
      lastLegDepartureKey
    );

    if (dayRole !== null) {
      const layover = dayRole === "LAYOVER_DAY" ? getLayoverForDate(trip, key) : null;
      calDay.events.push({
        tripNumber: trip.tripNumber,
        tripInstanceId,
        tripType: trip.tripType,
        typeInfo,
        dayRole,
        destinationCity: destCity,
        destinationCode: destCode,
        tripLabel,
        legs: legsThisDay,
        continuesFromYesterday: !isFirstDay,
        continuesTomorrow: !isLastDay,
        ...(layover && { layoverCity: getAirportCity(layover.airport) }),
      });
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  const lastDepKey = dateKey(lastLeg.departureDate);
  const lastArrKey = dateKey(lastLeg.arrivalDate ?? lastLeg.departureDate);
  if (lastDepKey !== lastArrKey) {
    const arrCalDay = findCalendarDay(calendar, lastLeg.arrivalDate ?? lastLeg.departureDate);
    if (arrCalDay) {
      const alreadyHasEvent = arrCalDay.events.some((e) => e.tripInstanceId === tripInstanceId);
      if (!alreadyHasEvent) {
        arrCalDay.events.push({
          tripNumber: trip.tripNumber,
          tripInstanceId,
          tripType: trip.tripType,
          typeInfo,
          dayRole: "ARRIVAL_ONLY",
          destinationCity: destCity,
          destinationCode: destCode,
          tripLabel,
          legs: [buildLegInfo(lastLeg)],
          continuesFromYesterday: true,
          continuesTomorrow: false,
        });
      }
    }
  }

  for (const { dateKeys, airport } of getFullLayoverDateKeys(trip)) {
    const layoverCity = getAirportCity(airport);
    for (const key of dateKeys) {
      const dayDate = new Date(key + "T00:00:00.000Z");
      const calDay = findCalendarDay(calendar, dayDate);
      if (!calDay) continue;
      const alreadyHasLayover = calDay.events.some(
        (e) => e.tripInstanceId === tripInstanceId && e.dayRole === "LAYOVER_DAY"
      );
      if (alreadyHasLayover) continue;
      calDay.events.push({
        tripNumber: trip.tripNumber,
        tripInstanceId,
        tripType: trip.tripType,
        typeInfo,
        dayRole: "LAYOVER_DAY",
        destinationCity: destCity,
        destinationCode: destCode,
        tripLabel,
        legs: [],
        continuesFromYesterday: true,
        continuesTomorrow: true,
        layoverCity,
      });
    }
  }
}

export function buildCalendarData(
  trips: TripCardData[],
  primaryMonth: number,
  primaryYear: number
): CalendarDayData[] {
  const calendar = createCalendarGrid(trips, primaryMonth, primaryYear);

  for (const trip of trips) {
    if (!trip.legs.length) continue;
    placeTripOnCalendar(trip, calendar);
  }

  for (const day of calendar) {
    day.events.sort((a, b) => {
      const aTime =
        a.legs.length > 0
          ? scheduleTimeToMinutes(
              a.dayRole === "ARRIVAL_ONLY"
                ? a.legs[0]!.arrivalTimeZ
                : a.legs[0]!.departureTimeZ
            )
          : 0;
      const bTime =
        b.legs.length > 0
          ? scheduleTimeToMinutes(
              b.dayRole === "ARRIVAL_ONLY"
                ? b.legs[0]!.arrivalTimeZ
                : b.legs[0]!.departureTimeZ
            )
          : 0;
      return aTime - bTime;
    });
  }

  return calendar;
}
