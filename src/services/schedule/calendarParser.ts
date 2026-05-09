/**
 * CrewTool-style weekly calendar PDF (text extraction) → ParsedSchedule.
 *
 * Calendar PDFs do not include per-leg aircraft or trip credit/TAFB. Prisma requires
 * non-null Float/String fields, so we store:
 * - creditHours / tafb on each trip as 0 (no credit/TAFB data from this source)
 * - aircraftTypeCode on each leg as "" (matching skips empty codes)
 * - blockHours computed from leg block time (departure → arrival), summed
 *
 * Reserve (RR), mandatory off (MD), and similar non-flying days are NOT persisted as
 * ScheduleTrip rows; counts are returned in CalendarParseMetadata only.
 */

import type { ParsedLayover, ParsedLeg, ParsedSchedule, ParsedTrip } from "@/types/schedule";
import { resolveArrivalDate } from "./dateResolver";
import { scheduleTimeToDecimalHours, scheduleTimeToMinutes } from "@/utils/timeUtils";

export interface CalendarParseMetadata {
  reserveDayCount: number;
  mandatoryOffCount: number;
  deadHeadLegCount: number;
}

export interface CalendarParseResult {
  schedule: ParsedSchedule;
  metadata: CalendarParseMetadata;
}

const MONTH_MAP: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const DOW_FROM_UTCDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

function utcDateNoon(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

function normalizeTime(t: string): string {
  return t.trim().replace(":", ".").replace(/Z$/i, "");
}

function legBlockHours(dep: string, arr: string, depDate: Date, arrDate: Date): number {
  const depM = scheduleTimeToMinutes(normalizeTime(dep));
  const arrM = scheduleTimeToMinutes(normalizeTime(arr));
  const dayMs = arrDate.getTime() - depDate.getTime();
  const dayMinutes = Math.round(dayMs / (60 * 1000));
  return (dayMinutes + arrM - depM) / 60;
}

/** Flight: SV123 / SA123 (Saudia) or DH456 */
const FLIGHT_LINE =
  /\b((?:SV|SA)\s*\d{2,4}|DH\s*\d{2,4})\b\s+([A-Z]{3})\s+(\d{1,2}[:.]\d{2})\s+([A-Z]{3})\s+(\d{1,2}[:.]\d{2})/gi;

/** Explicit calendar date: "26 May 2026" or "26 May" */
const EXPLICIT_DATE =
  /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+(\d{4}))?\b/gi;

function monthFromName(name: string): number {
  return MONTH_MAP[name.toLowerCase().slice(0, 3)] ?? 0;
}

/**
 * Find the last explicit calendar date before `position` in text (search window).
 */
function findDateBefore(
  text: string,
  position: number,
  defaultMonth: number,
  defaultYear: number
): { y: number; m: number; d: number } | null {
  const windowStart = Math.max(0, position - 800);
  const slice = text.slice(windowStart, position);
  let last: { y: number; m: number; d: number } | null = null;
  EXPLICIT_DATE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = EXPLICIT_DATE.exec(slice)) !== null) {
    const d = parseInt(m[1]!, 10);
    const mon = monthFromName(m[2]!);
    const y = m[3] ? parseInt(m[3], 10) : defaultYear;
    if (mon && d >= 1 && d <= 31) {
      last = { d, m: mon, y };
    }
  }
  if (!last) {
    if (defaultMonth && defaultYear) return { d: 1, m: defaultMonth, y: defaultYear };
    return null;
  }
  return last;
}

interface FlyingLegDraft {
  flightNumber: string;
  departureAirport: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalTime: string;
}

interface DutyDayDraft {
  dutyDate: { y: number; m: number; d: number } | null;
  reportTime: string | null;
  releaseTime: string | null;
  legs: FlyingLegDraft[];
  /** True if this day's text mentions Hotel (multi-day trip continuation). */
  hasHotel: boolean;
  isReserveDay: boolean;
  isMandatoryOff: boolean;
}

function parseDutyDayBlock(block: string, anchorDate: { y: number; m: number; d: number } | null): DutyDayDraft {
  const upper = block.toUpperCase();
  const isReserveDay = /\bRR\b/.test(upper) || /\bRESERVE\b/.test(upper);
  const isMandatoryOff = /\bMD\b/.test(upper) || (/\bMANDATORY\b/.test(upper) && /\bOFF\b/.test(upper));

  const reportMatch = block.match(/\bReport\s+(\d{1,2}[:.]\d{2})/i);
  const releaseMatch = block.match(/\bRelease\s+(\d{1,2}[:.]\d{2})/i);

  const legs: FlyingLegDraft[] = [];
  FLIGHT_LINE.lastIndex = 0;
  let fm: RegExpExecArray | null;
  while ((fm = FLIGHT_LINE.exec(block)) !== null) {
    const rawFn = fm[1]!.replace(/\s+/g, "").toUpperCase();
    legs.push({
      flightNumber: rawFn,
      departureAirport: fm[2]!.toUpperCase(),
      departureTime: normalizeTime(fm[3]!),
      arrivalAirport: fm[4]!.toUpperCase(),
      arrivalTime: normalizeTime(fm[5]!),
    });
  }

  return {
    dutyDate: anchorDate,
    reportTime: reportMatch?.[1]?.replace(":", ".") ?? null,
    releaseTime: releaseMatch?.[1]?.replace(":", ".") ?? null,
    legs,
    hasHotel: /\bHotel\b/i.test(block),
    isReserveDay,
    isMandatoryOff,
  };
}

/** Split calendar body at each Report time — one chunk per duty day. */
function splitByReportMarkers(raw: string): Array<{ start: number; text: string }> {
  const re = /\bReport\s+\d{1,2}[:.]\d{2}\b/gi;
  const hits: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    hits.push(m.index);
  }
  const chunks: Array<{ start: number; text: string }> = [];
  for (let i = 0; i < hits.length; i++) {
    const start = hits[i]!;
    const end = i + 1 < hits.length ? hits[i + 1]! : raw.length;
    chunks.push({ start, text: raw.slice(start, end).trim() });
  }
  return chunks;
}

/** Also pick up RR/MD-only lines that never use "Report". */
function countNonFlyingMarkers(text: string): { rr: number; md: number } {
  let rr = 0;
  let md = 0;
  const lines = text.split(/\n/).map((l) => l.trim());
  for (const line of lines) {
    if (!line) continue;
    const u = line.toUpperCase();
    if (/\bRR\b/.test(u) && !/^Report\s/i.test(line)) rr++;
    if (/\bMD\b/.test(u)) md++;
  }
  return { rr, md };
}

function buildParsedTripsFromDutyDays(
  days: DutyDayDraft[],
  defaultYear: number,
  defaultMonth: number
): { trips: ParsedTrip[]; deadHeadLegCount: number; reserveDayCount: number; mandatoryOffCount: number } {
  let tripSeq = 0;
  const trips: ParsedTrip[] = [];
  let deadHeadLegCount = 0;
  let reserveDayCount = 0;
  let mandatoryOffCount = 0;

  /** Open multi-day trip: accumulate flying legs across consecutive Hotel-linked days */
  let openLegs: ParsedLeg[] = [];
  let openLayovers: ParsedLayover[] = [];
  let openBlockSum = 0;
  let openReportTime = "00.00Z";
  let openReportDate: Date | undefined;
  let hotelContinues = false;

  const closeOpenTrip = () => {
    if (openLegs.length === 0) return;
    tripSeq++;
    const tripNumber = `TRIP_${tripSeq}`;
    trips.push({
      tripNumber,
      instanceId: tripNumber,
      reportTime: openReportTime.endsWith("Z") ? openReportTime : `${openReportTime}Z`,
      reportDate: openReportDate,
      legs: openLegs,
      layovers: openLayovers.length ? openLayovers : undefined,
      creditHours: 0,
      blockHours: openBlockSum,
      tafb: 0,
    });
    openLegs = [];
    openLayovers = [];
    openBlockSum = 0;
    hotelContinues = false;
  };

  for (const day of days) {
    if (day.isReserveDay && day.legs.length === 0) {
      reserveDayCount++;
      if (!day.hasHotel) continue;
    }
    if (day.isMandatoryOff && day.legs.length === 0) {
      mandatoryOffCount++;
      if (!day.hasHotel) continue;
    }

    if (day.legs.length === 0 && !day.hasHotel) continue;

    const ymd =
      day.dutyDate ?? (defaultYear && defaultMonth ? { y: defaultYear, m: defaultMonth, d: 1 } : null);
    if (!ymd) continue;

    const dutyDate = utcDateNoon(ymd.y, ymd.m, ymd.d);

    if (!hotelContinues) {
      closeOpenTrip();
      openReportTime = day.reportTime ? normalizeTime(day.reportTime) : "00.00";
      if (!openReportTime.endsWith("Z")) openReportTime = `${openReportTime}Z`;
      openReportDate = dutyDate;
    }

    const legOrderOffset = openLegs.length;
    let currentDepDate = new Date(dutyDate);

    for (let i = 0; i < day.legs.length; i++) {
      const lg = day.legs[i]!;
      if (lg.flightNumber.startsWith("DH")) deadHeadLegCount++;

      const departureDate = new Date(currentDepDate);
      const arrivalDate = resolveArrivalDate(departureDate, lg.departureTime, lg.arrivalTime);
      const blk = legBlockHours(lg.departureTime, lg.arrivalTime, departureDate, arrivalDate);
      openBlockSum += blk;

      const dow = DOW_FROM_UTCDAY[departureDate.getUTCDay()] ?? "SU";

      openLegs.push({
        legOrder: legOrderOffset + i + 1,
        dayOfWeek: dow,
        flightNumber: lg.flightNumber,
        aircraftTypeCode: "",
        departureDate,
        departureTime: lg.departureTime,
        departureAirport: lg.departureAirport,
        arrivalDate,
        arrivalTime: lg.arrivalTime,
        arrivalAirport: lg.arrivalAirport,
        flyingTimeRaw: undefined,
        flyingTime: scheduleTimeToDecimalHours(
          `${Math.floor(blk)}.${Math.round((blk % 1) * 60)}`
        ),
      });

      currentDepDate = new Date(arrivalDate);
    }

    if (day.hasHotel && day.legs.length > 0) {
      const lastLeg = day.legs[day.legs.length - 1]!;
      const lastAirport = lastLeg.arrivalAirport;
      const rawDur = day.releaseTime ?? "0.00";
      const durationDecimal = scheduleTimeToDecimalHours(normalizeTime(rawDur));
      openLayovers.push({
        airport: lastAirport,
        durationRaw: rawDur,
        durationDecimal,
        afterLegOrder: openLegs.length,
      });
    }

    hotelContinues = day.hasHotel;
    if (!hotelContinues) {
      closeOpenTrip();
    }
  }

  closeOpenTrip();

  return { trips, deadHeadLegCount, reserveDayCount, mandatoryOffCount };
}

/**
 * Parse CrewTool calendar plain text into trips + metadata.
 */
export function parseCalendarSchedule(rawText: string, month: number, year: number): CalendarParseResult {
  const extra = countNonFlyingMarkers(rawText);

  const reportChunks = splitByReportMarkers(rawText);
  const dutyDays: DutyDayDraft[] = [];

  for (const chunk of reportChunks) {
    const anchor = findDateBefore(rawText, chunk.start, month, year);
    const day = parseDutyDayBlock(chunk.text, anchor);
    dutyDays.push(day);
  }

  let { trips, deadHeadLegCount, reserveDayCount, mandatoryOffCount } = buildParsedTripsFromDutyDays(
    dutyDays,
    year,
    month
  );

  reserveDayCount += extra.rr;
  mandatoryOffCount += extra.md;

  const totalBlock = trips.reduce((s, t) => s + t.blockHours, 0);

  const schedule: ParsedSchedule = {
    lineNumber: "CALENDAR",
    month,
    year,
    totalCredit: undefined,
    totalBlock: totalBlock > 0 ? totalBlock : undefined,
    daysOff: undefined,
    dutyPeriods: undefined,
    trips,
  };

  return {
    schedule,
    metadata: {
      reserveDayCount,
      mandatoryOffCount,
      deadHeadLegCount,
    },
  };
}
