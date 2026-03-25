import type { AirlineConfig } from "@/types/airline";
import type { ParsedSchedule, ParsedTrip, ParsedLeg } from "@/types/schedule";

const DAY_ABBREV_TO_DOW: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

export interface ParseLineInput {
  rawText: string;
  month: number;
  year: number;
  lineNumber?: string;
  config: AirlineConfig;
}

/**
 * Parse a Line schedule text into ParsedSchedule with trips and legs.
 * Uses airline config patterns (trip, leg, layover, credit).
 * Resolves departureDate for each leg from month/year and trip order or calendar grid.
 */
export function parseLineSchedule(input: ParseLineInput): ParsedSchedule {
  const { rawText, month, year, lineNumber, config } = input;
  const format = config.scheduleFormat;
  if (!format) {
    throw new Error("Airline has no scheduleFormat configured");
  }

  const lineNum = lineNumber ?? parseLineNumber(rawText);
  const tripGridMap = parseCalendarGrid(rawText, month, year);

  const trips: ParsedTrip[] = [];
  const lines = rawText.split(/\r?\n/);

  let i = 0;
  while (i < lines.length) {
    const tripMatch = lines[i].match(format.tripPattern);
    if (!tripMatch) {
      i++;
      continue;
    }

    const [, tripNum, reportTime] = tripMatch;
    if (!tripNum || !reportTime) {
      i++;
      continue;
    }

    const legs: ParsedLeg[] = [];
    let creditHours = 0;
    let blockHours = 0;
    let tafb = 0;
    let legOrder = 0;
    i++;

    while (i < lines.length) {
      const line = lines[i];
      const legMatch = line.match(format.legPattern);
      if (legMatch) {
        const [
          ,
          dayAbbrev,
          flightNum,
          aircraftCode,
          depTime,
          depAirport,
          arrTime,
          arrAirport,
          blockStr,
        ] = legMatch;
        const blockTime = parseBlockTime(blockStr);
        legOrder++;
        const departureDate = resolveLegDate(
          tripNum,
          dayAbbrev ?? "",
          legOrder,
          tripGridMap,
          month,
          year
        );
        legs.push({
          legOrder,
          dayOfWeek: dayAbbrev ?? "",
          flightNumber: flightNum ?? "",
          aircraftTypeCode: aircraftCode ?? "",
          departureDate,
          departureTime: depTime ?? "",
          departureAirport: depAirport ?? "",
          arrivalTime: arrTime ?? "",
          arrivalAirport: arrAirport ?? "",
          flyingTime: blockTime,
        });
        i++;
        continue;
      }

      const layoverMatch = line.match(format.layoverPattern);
      if (layoverMatch) {
        const [, layAirport, layDuration] = layoverMatch;
        const durationHours = parseLayoverDuration(layDuration);
        if (legs.length > 0) {
          legs[legs.length - 1].layoverAirport = layAirport;
          legs[legs.length - 1].layoverDuration = durationHours;
        }
        i++;
        continue;
      }

      const creditMatch = line.match(format.creditPattern);
      if (creditMatch) {
        const [, cr, blk, tafbStr] = creditMatch;
        creditHours = parseDecimalTime(cr);
        blockHours = parseDecimalTime(blk);
        tafb = parseDecimalTime(tafbStr);
        i++;
        break;
      }

      if (line.trim() === "" || line.match(/^#\d{3}\s+REPORT/i)) {
        break;
      }
      i++;
    }

    if (legs.length > 0 || creditHours > 0) {
      const grid = tripGridMap.get(tripNum);
      trips.push({
        tripNumber: tripNum,
        instanceId: tripNum,
        reportTime,
        reportDate: grid?.reportDate,
        legs,
        creditHours,
        blockHours,
        tafb,
      });
    }
  }

  const [totalCredit, totalBlock, daysOff, dutyPeriods] = parseHeaderTotals(rawText);

  return {
    lineNumber: lineNum,
    month,
    year,
    totalCredit,
    totalBlock,
    daysOff,
    dutyPeriods,
    trips,
  };
}

function parseLineNumber(text: string): string {
  const m = text.match(/LINE\s+(\d+)/i);
  return m ? m[1]! : "0";
}

function parseBlockTime(s: string | undefined): number {
  if (!s) return 0;
  const [h, m] = s.split(".").map(Number);
  return (h ?? 0) + ((m ?? 0) / 60);
}

function parseDecimalTime(s: string | undefined): number {
  if (!s) return 0;
  const [h, m] = s.split(".").map(Number);
  return (h ?? 0) + ((m ?? 0) / 60);
}

function parseLayoverDuration(s: string | undefined): number {
  if (!s) return 0;
  // Support "26.10" (hours.decimal) or "26:10" (hours:minutes)
  if (s.includes(":")) {
    const [h, m] = s.split(":").map(Number);
    return (h ?? 0) + ((m ?? 0) / 60);
  }
  const [h, m] = s.split(".").map(Number);
  return (h ?? 0) + ((m ?? 0) / 60);
}

/** Parse header totals (CR., BLK, OFF, NO. DP'S) if present */
function parseHeaderTotals(
  text: string
): [number | undefined, number | undefined, number | undefined, number | undefined] {
  let totalCredit: number | undefined;
  let totalBlock: number | undefined;
  let daysOff: number | undefined;
  let dutyPeriods: number | undefined;

  const crMatch = text.match(/CR\.\s*(\d+\.?\d*)/i);
  if (crMatch) totalCredit = parseFloat(crMatch[1]!);

  const blkMatch = text.match(/BLK\s*(\d+\.?\d*)/i);
  if (blkMatch) totalBlock = parseFloat(blkMatch[1]!);

  const offMatch = text.match(/OFF\s*(\d+)/i);
  if (offMatch) daysOff = parseInt(offMatch[1]!, 10);

  const dpMatch = text.match(/NO\.\s*DP'S\s*(\d+)/i);
  if (dpMatch) dutyPeriods = parseInt(dpMatch[1]!, 10);

  return [totalCredit, totalBlock, daysOff, dutyPeriods];
}

const DOW_ABBREVS = new Set(["MO", "TU", "WE", "TH", "FR", "SA", "SU"]);

function isDowRow(tokens: string[]): boolean {
  if (tokens.length < 5) return false;
  const match = tokens.filter((t) => DOW_ABBREVS.has(t.toUpperCase()));
  return match.length >= 5;
}

export interface TripGridInfo {
  reportDate: Date;
  firstLegNextDay: boolean;
  dates: Date[];
}

/**
 * Parse the calendar grid at the top of the line schedule.
 * Row 1: calendar dates (2 3 4 5 ...)
 * Row 2: weekday labels (MO TU WE ...)
 * Row 3: trip numbers under the correct date column (003, 030, ...)
 * Row 4: destinations; "<" in a column means report is late evening that day, first flight departs after midnight (next day).
 * Returns tripNumber -> { reportDate, firstLegNextDay, dates } for date resolution.
 */
function parseCalendarGrid(
  text: string,
  month: number,
  year: number
): Map<string, TripGridInfo> {
  const result = new Map<string, TripGridInfo>();
  const lines = text.split(/\r?\n/).slice(0, 50);

  let dateLineIdx = -1;
  let dateByIndex: (number | null)[] = [];
  for (let idx = 0; idx < lines.length; idx++) {
    const tokens = lines[idx]!.trim().split(/\s+/);
    dateByIndex = tokens.map((s) => {
      const n = parseInt(s, 10);
      return !Number.isNaN(n) && n >= 1 && n <= 31 ? n : null;
    });
    if (dateByIndex.filter((n) => n !== null).length >= 5) {
      dateLineIdx = idx;
      break;
    }
  }
  if (dateLineIdx < 0 || dateByIndex.filter((n) => n !== null).length < 5) return result;

  let rowIdx = dateLineIdx + 1;
  if (rowIdx < lines.length && isDowRow(lines[rowIdx]!.trim().split(/\s+/))) rowIdx++;

  // Row 3: trip numbers -> reportDate (first occurrence = report date), and which column index
  const tripReportDate = new Map<string, Date>();
  const tripFirstColumn = new Map<string, number>();
  const tripDates = new Map<string, Date[]>();

  const tripRow = rowIdx < lines.length ? lines[rowIdx]!.trim().split(/\s+/) : [];
  for (let i = 0; i < dateByIndex.length && i < tripRow.length; i++) {
    const day = dateByIndex[i];
    if (day == null) continue;
    const cell = tripRow[i];
    if (!cell) continue;
    const tripNum = cell.match(/^\d{3}$/) ? cell : null;
    if (tripNum) {
      const date = new Date(year, month - 1, day);
      if (!tripReportDate.has(tripNum)) {
        tripReportDate.set(tripNum, date);
        tripFirstColumn.set(tripNum, i);
      }
      if (!tripDates.has(tripNum)) tripDates.set(tripNum, []);
      const list = tripDates.get(tripNum)!;
      if (!list.some((d) => d.getTime() === date.getTime())) list.push(date);
    }
  }

  // Row 4: "<" in a column means first flight departs next day (report late evening that date)
  const columnHasNextDay = new Set<number>();
  rowIdx++;
  if (rowIdx < lines.length) {
    const destRow = lines[rowIdx]!.trim().split(/\s+/);
    for (let i = 0; i < destRow.length; i++) {
      const cell = destRow[i] ?? "";
      if (cell.includes("<") || cell === "<") columnHasNextDay.add(i);
    }
  }

  for (const [tripNum, reportDate] of tripReportDate) {
    const firstCol = tripFirstColumn.get(tripNum);
    const firstLegNextDay = firstCol !== undefined && columnHasNextDay.has(firstCol);
    const dates = (tripDates.get(tripNum) ?? []).sort((a, b) => a.getTime() - b.getTime());
    result.set(tripNum, { reportDate, firstLegNextDay, dates });
  }

  return result;
}

function resolveLegDate(
  tripNumber: string,
  dayAbbrev: string,
  legOrder: number,
  tripGridMap: Map<string, TripGridInfo>,
  month: number,
  year: number
): Date | undefined {
  const grid = tripGridMap.get(tripNumber);
  const dow = DAY_ABBREV_TO_DOW[dayAbbrev.toUpperCase()];

  if (grid) {
    // Leg 1: report date is the column date; if "<" then first flight departs next day
    if (legOrder === 1) {
      if (grid.firstLegNextDay) {
        const nextDay = new Date(grid.reportDate);
        nextDay.setDate(nextDay.getDate() + 1);
        return nextDay;
      }
      return grid.reportDate;
    }

    // Leg 2+: use trip's dates and match DOW, or use report date + offset
    const dates = grid.dates;
    if (dates.length > 0 && typeof dow === "number") {
      const firstLegDate = grid.firstLegNextDay
        ? (() => {
            const d = new Date(grid.reportDate);
            d.setDate(d.getDate() + 1);
            return d;
          })()
        : grid.reportDate;
      const match = dates.find((d) => d.getDay() === dow && d.getTime() >= firstLegDate.getTime());
      if (match) return match;
      const afterFirst = dates.filter((d) => d.getTime() >= firstLegDate.getTime());
      if (afterFirst.length >= legOrder) return afterFirst[legOrder - 1] ?? undefined;
      if (afterFirst.length > 0) return afterFirst[afterFirst.length - 1];
      return dates[Math.min(legOrder - 1, dates.length - 1)] ?? dates[0];
    }
    if (dates.length > 0) {
      const firstLegDate = grid.firstLegNextDay
        ? (() => {
            const d = new Date(grid.reportDate);
            d.setDate(d.getDate() + 1);
            return d;
          })()
        : grid.reportDate;
      const afterFirst = dates.filter((d) => d.getTime() >= firstLegDate.getTime());
      if (afterFirst.length >= legOrder) return afterFirst[legOrder - 1] ?? undefined;
      return dates[Math.min(legOrder - 1, dates.length - 1)] ?? dates[0];
    }
  }

  // Fallback when grid was not parsed
  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = new Date(year, month, 0);
  if (typeof dow === "number") {
    let d = new Date(firstOfMonth);
    while (d.getDay() !== dow && d <= lastOfMonth) d.setDate(d.getDate() + 1);
    if (d <= lastOfMonth) {
      const legDate = new Date(d);
      legDate.setDate(legDate.getDate() + (legOrder - 1));
      if (legDate.getMonth() === month - 1 && legDate <= lastOfMonth) return legDate;
      return d;
    }
  }
  const firstDay = new Date(year, month - 1, 1);
  const d = new Date(firstDay);
  d.setDate(d.getDate() + (legOrder - 1));
  if (d.getMonth() !== month - 1) return undefined;
  return d;
}
