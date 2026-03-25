/**
 * Parse the 5-row calendar grid header using CHARACTER POSITIONS to align columns.
 * Rows 3 and 4 have gaps (empty columns); token index alignment is wrong.
 * We find the character position of each day number in Row 1 and use those as column anchors.
 */

// ============================================================
// INTERFACES
// ============================================================

export interface ScheduleHeader {
  lineNumber: string;
  creditHours: number;
  blockHours: number;
  daysOff: number;
  dutyPeriods: number;
  tai: number;
  tad: number;
  tar: number;
  carryOver: number;
  /** First day shown in grid (e.g. 2 = March 2). Used for earliestAllowed in date resolution. */
  rosterStartDay: number;
  calendarDays: CalendarDay[];
}

export interface CalendarDay {
  dayOfMonth: number;
  /** 1-12; can be primary or next month when grid spans two months. */
  month: number;
  year: number;
  weekday: string;
  tripNumber: string | null;
  destination: string | null;
  symbol: string | null;
  date: Date;
  columnIndex: number;
}

/** Grid day with month rollover (e.g. 31 → 1 = next month). */
export interface GridDay {
  day: number;
  month: number;
  year: number;
}

// ============================================================
// TRIP ORDER (for date resolution without calendar grid)
// Row 3 lists trip numbers left-to-right in chronological order.
// ============================================================

export function extractTripOrder(row3: string): string[] {
  const trips: string[] = [];
  const dpMatch = row3.match(/DP'?S?\s+\d+/i);
  const searchRegion = dpMatch
    ? row3.substring((dpMatch.index ?? 0) + dpMatch[0].length)
    : row3;
  const regionPattern = /\b(\d{3})\b/g;
  let match: RegExpExecArray | null;
  while ((match = regionPattern.exec(searchRegion)) !== null) {
    trips.push(match[1]!);
  }
  return trips;
}

// ============================================================
// GRID DAY NUMBERS WITH MONTH ROLLOVER (cross-month support)
// ============================================================

/**
 * Parse day numbers from Row 1 and assign (day, month, year) per column.
 * When day sequence drops (e.g. 31 → 1), the next month is used.
 */
export function parseGridDayNumbers(
  row1: string,
  primaryMonth: number,
  primaryYear: number
): GridDay[] {
  const dayColumns = findDayColumns(row1);
  const rawDays = dayColumns.map((c) => c.dayOfMonth);
  if (rawDays.length === 0) return [];

  const result: GridDay[] = [];
  let currentMonth = primaryMonth;
  let currentYear = primaryYear;
  let previousDay = 0;

  for (const day of rawDays) {
    if (day < previousDay && previousDay >= 28) {
      currentMonth += 1;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear += 1;
      }
    }
    result.push({ day, month: currentMonth, year: currentYear });
    previousDay = day;
  }
  return result;
}

/**
 * Chronological trip order from the calendar grid (first occurrence per trip).
 * More reliable than Row 3 left-to-right when there are empty cells.
 */
export function getTripOrderFromCalendar(calendarDays: CalendarDay[]): string[] {
  const order: string[] = [];
  for (const day of calendarDays) {
    if (day.tripNumber) order.push(day.tripNumber);
  }
  return removeConsecutiveDuplicates(order);
}

function removeConsecutiveDuplicates(values: string[]): string[] {
  return values.filter((value, index) => index === 0 || value !== values[index - 1]);
}

// ============================================================
// MAIN ENTRY POINT
// ============================================================

export function parseHeader(
  headerLines: string[],
  month: number,
  year: number
): ScheduleHeader {
  const row1 = headerLines[0] ?? "";
  const row2 = headerLines[1] ?? "";
  const row3 = headerLines[2] ?? "";
  const row4 = headerLines[3] ?? "";
  const row5 = headerLines[4] ?? "";

  const summaryData = extractSummaryData(row1, row2, row3, row4, row5);

  const dayColumns = findDayColumns(row1);
  const gridDays = parseGridDayNumbers(row1, month, year);

  let calendarDays: CalendarDay[];
  let rosterStartDay: number;

  if (gridDays.length > 0 && gridDays.length === dayColumns.length) {
    rosterStartDay = gridDays[0]!.day;
    const weekdaysByIndex = findWeekdaysAtPositionsByIndex(row2, dayColumns);
    const tripAssignmentsByIndex = findTripsAtPositionsByIndex(row3, dayColumns);
    const destinationByIndex = findDestinationsAtPositionsByIndex(row4, dayColumns);
    calendarDays = buildCalendarDaysFromGrid(
      gridDays,
      weekdaysByIndex,
      tripAssignmentsByIndex,
      destinationByIndex
    );
  } else {
    rosterStartDay = dayColumns[0]?.dayOfMonth ?? 1;
    const daysInThisMonth = new Date(year, month, 0).getDate();
    const marchDayColumns = buildMonthDayColumns(dayColumns, daysInThisMonth);
    const weekdays = findWeekdaysAtPositions(row2, marchDayColumns);
    const tripAssignments = findTripsAtPositions(row3, marchDayColumns);
    const destinationMap = findDestinationsAtPositions(row4, marchDayColumns);
    calendarDays = buildCalendarDays(
      marchDayColumns,
      weekdays,
      tripAssignments,
      destinationMap,
      month,
      year
    );
  }

  return {
    ...summaryData,
    rosterStartDay,
    calendarDays,
  };
}

// ============================================================
// STEP 1: Extract summary numbers (regex only, no alignment)
// ============================================================

interface SummaryData {
  lineNumber: string;
  creditHours: number;
  blockHours: number;
  daysOff: number;
  dutyPeriods: number;
  tai: number;
  tad: number;
  tar: number;
  carryOver: number;
}

function extractSummaryData(
  row1: string,
  row2: string,
  row3: string,
  row4: string,
  row5: string
): SummaryData {
  return {
    lineNumber: extractLineNumber(row1),
    creditHours: extractNumberAfter(row1, /CR\.?\s+/),
    blockHours: extractNumberAfter(row2, /BLK\.?\s+/),
    daysOff: extractIntAfter(row3, /OFF\s+/),
    dutyPeriods: extractIntAfter(row3, /(?:NO\.?\s*)?DP'?S?\s+/),
    tai: extractNumberAfter(row4, /TAI\s+/),
    tad: extractNumberAfter(row4, /TAD\s+/),
    tar: extractNumberAfter(row5, /TAR\s+/),
    carryOver: extractNumberAfter(row5, /C\/O\s+/),
  };
}

function extractLineNumber(row: string): string {
  const match = row.match(/LINE\s*(\d+)/i);
  return match ? match[1]! : "0";
}

function extractNumberAfter(row: string, pattern: RegExp): number {
  const match = row.match(new RegExp(pattern.source + "(\\d+\\.\\d+)", "i"));
  return match ? parseFloat(match[1]!) : 0;
}

function extractIntAfter(row: string, pattern: RegExp): number {
  const match = row.match(new RegExp(pattern.source + "(\\d+)", "i"));
  return match ? parseInt(match[1]!, 10) : 0;
}

// ============================================================
// STEP 2: Find character positions of day numbers in Row 1
// ============================================================

export interface DayColumn {
  dayOfMonth: number;
  charPosition: number;
}

export function findDayColumns(row1: string): DayColumn[] {
  const dayColumns: DayColumn[] = [];
  const crMatch = row1.match(/CR\.?\s+\d+\.?\d*\s+/i);
  const searchStartPos = crMatch ? (crMatch.index ?? 0) + crMatch[0].length : 0;
  const dayRegion = row1.substring(searchStartPos);
  const regionPattern = /(?<!\d)(\d{1,2}):?(?!\d)/g;
  let match: RegExpExecArray | null;

  while ((match = regionPattern.exec(dayRegion)) !== null) {
    const dayNum = parseInt(match[1]!, 10);
    if (dayNum >= 1 && dayNum <= 31) {
      dayColumns.push({
        dayOfMonth: dayNum,
        charPosition: searchStartPos + match.index,
      });
    }
  }
  return dayColumns;
}

/** Weekdays keyed by column index (for cross-month calendar). */
function findWeekdaysAtPositionsByIndex(
  row2: string,
  dayColumns: DayColumn[]
): Map<number, string> {
  const weekdayMap = new Map<number, string>();
  const weekdayPositions = findAllTokenPositions(
    row2,
    /\b(MO|TU|WE|TH|FR|SA|SU):?\b/gi
  );
  dayColumns.forEach((col, i) => {
    const closest = findClosestToken(col.charPosition, weekdayPositions);
    if (closest) weekdayMap.set(i, closest.token.toUpperCase());
  });
  return weekdayMap;
}

/** Trip numbers keyed by column index. */
function findTripsAtPositionsByIndex(
  row3: string,
  dayColumns: DayColumn[]
): Map<number, string> {
  const tripMap = new Map<number, string>();
  const dpMatch = row3.match(/DP'?S?\s+\d+\s*/i);
  const searchStart = dpMatch ? (dpMatch.index ?? 0) + dpMatch[0].length : 0;
  const tripRegion = row3.substring(searchStart);
  const tripPositions = findAllTokenPositions(
    tripRegion,
    /\b(\d{3})\b/g,
    searchStart
  );
  dayColumns.forEach((col, i) => {
    const closest = findClosestToken(col.charPosition, tripPositions);
    if (closest) tripMap.set(i, closest.token);
  });
  return tripMap;
}

/** Destinations/symbols keyed by column index. */
function findDestinationsAtPositionsByIndex(
  row4: string,
  dayColumns: DayColumn[]
): Map<number, string> {
  const destMap = new Map<number, string>();
  const tadMatch = row4.match(/TAD\s+\d+\.?\d*\s*/i);
  const searchStart = tadMatch ? (tadMatch.index ?? 0) + tadMatch[0].length : 0;
  const destRegion = row4.substring(searchStart);
  const destPositions = findAllTokenPositions(
    destRegion,
    /\b([A-Z]{3}|[*<\-]):?\b/gi,
    searchStart
  );
  const symbolPositions = findAllSymbolPositions(destRegion, searchStart);
  const allPositions = deduplicateByPosition([...destPositions, ...symbolPositions]);
  dayColumns.forEach((col, i) => {
    const closest = findClosestToken(col.charPosition, allPositions);
    if (closest) destMap.set(i, closest.token.toUpperCase());
  });
  return destMap;
}

/**
 * Build calendar days from grid with (day, month, year) per column (cross-month).
 */
function buildCalendarDaysFromGrid(
  gridDays: GridDay[],
  weekdaysByIndex: Map<number, string>,
  tripAssignmentsByIndex: Map<number, string>,
  destinationByIndex: Map<number, string>
): CalendarDay[] {
  return gridDays.map((gd, index) => {
    const dest = destinationByIndex.get(index) ?? null;
    const isSymbol = dest === "*" || dest === "<" || dest === "-";
    return {
      dayOfMonth: gd.day,
      month: gd.month,
      year: gd.year,
      weekday: weekdaysByIndex.get(index) ?? "",
      tripNumber: tripAssignmentsByIndex.get(index) ?? null,
      destination: isSymbol ? null : dest,
      symbol: isSymbol ? dest : null,
      date: new Date(Date.UTC(gd.year, gd.month - 1, gd.day)),
      columnIndex: index,
    };
  });
}

/** Build 31 (or 28–31) day columns for the given month; prepend day 1 if row starts with 2. */
function buildMonthDayColumns(
  dayColumns: DayColumn[],
  daysInThisMonth: number
): DayColumn[] {
  if (dayColumns.length === 0) {
    return Array.from({ length: daysInThisMonth }, (_, i) => ({
      dayOfMonth: i + 1,
      charPosition: -1,
    }));
  }
  const firstDay = dayColumns[0]!.dayOfMonth;
  let list: DayColumn[];
  if (firstDay !== 1) {
    const prepend: DayColumn = {
      dayOfMonth: 1,
      charPosition: dayColumns[0]!.charPosition - 4,
    };
    list = [prepend, ...dayColumns.slice(0, daysInThisMonth - 1)];
  } else {
    list = dayColumns.slice(0, daysInThisMonth);
  }
  return list.slice(0, daysInThisMonth);
}

// ============================================================
// STEP 3: Find weekdays at the same character positions in Row 2
// ============================================================

function findWeekdaysAtPositions(
  row2: string,
  dayColumns: DayColumn[]
): Map<number, string> {
  const weekdayMap = new Map<number, string>();
  const weekdayPositions = findAllTokenPositions(
    row2,
    /\b(MO|TU|WE|TH|FR|SA|SU):?\b/gi
  );
  for (const dayCol of dayColumns) {
    const closest = findClosestToken(dayCol.charPosition, weekdayPositions);
    if (closest) weekdayMap.set(dayCol.dayOfMonth, closest.token.toUpperCase());
  }
  return weekdayMap;
}

// ============================================================
// STEP 4: Find trip numbers at the same character positions in Row 3
// ============================================================

export function findTripsAtPositions(
  row3: string,
  dayColumns: DayColumn[]
): Map<number, string> {
  const tripMap = new Map<number, string>();
  const dpMatch = row3.match(/DP'?S?\s+\d+\s*/i);
  const searchStart = dpMatch ? (dpMatch.index ?? 0) + dpMatch[0].length : 0;
  const tripRegion = row3.substring(searchStart);
  const tripPositions = findAllTokenPositions(
    tripRegion,
    /\b(\d{3})\b/g,
    searchStart
  );
  for (const tripPos of tripPositions) {
    const closestDay = findClosestDayColumn(tripPos.position, dayColumns);
    if (closestDay) tripMap.set(closestDay.dayOfMonth, tripPos.token);
  }
  return tripMap;
}

// ============================================================
// STEP 5: Find destinations/symbols at the same positions in Row 4
// ============================================================

export function findDestinationsAtPositions(
  row4: string,
  dayColumns: DayColumn[]
): Map<number, string> {
  const destMap = new Map<number, string>();
  const tadMatch = row4.match(/TAD\s+\d+\.?\d*\s*/i);
  const searchStart = tadMatch ? (tadMatch.index ?? 0) + tadMatch[0].length : 0;
  const destRegion = row4.substring(searchStart);
  const destPositions = findAllTokenPositions(
    destRegion,
    /\b([A-Z]{3}|[*<\-]):?\b/gi,
    searchStart
  );
  const symbolPositions = findAllSymbolPositions(destRegion, searchStart);
  const allPositions = deduplicateByPosition([...destPositions, ...symbolPositions]);
  for (const destPos of allPositions) {
    const closestDay = findClosestDayColumn(destPos.position, dayColumns);
    if (closestDay) destMap.set(closestDay.dayOfMonth, destPos.token.toUpperCase());
  }
  return destMap;
}

// ============================================================
// HELPERS: Token positions and closest column
// ============================================================

interface TokenPosition {
  token: string;
  position: number;
}

function findAllTokenPositions(
  text: string,
  pattern: RegExp,
  positionOffset = 0
): TokenPosition[] {
  const results: TokenPosition[] = [];
  let match: RegExpExecArray | null;
  const flags = pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g";
  const pat = new RegExp(pattern.source, flags);
  while ((match = pat.exec(text)) !== null) {
    results.push({
      token: (match[1] ?? match[0]).replace(":", ""),
      position: positionOffset + match.index,
    });
  }
  return results;
}

function findAllSymbolPositions(
  text: string,
  positionOffset: number
): TokenPosition[] {
  const results: TokenPosition[] = [];
  const pattern = /(?<=\s|^)([*<\-])(?=\s|$|:)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    results.push({
      token: match[1]!,
      position: positionOffset + match.index,
    });
  }
  return results;
}

function findClosestDayColumn(
  charPos: number,
  dayColumns: DayColumn[]
): DayColumn | null {
  if (dayColumns.length === 0) return null;
  let closest = dayColumns[0]!;
  let minDistance = Math.abs(charPos - closest.charPosition);
  for (const col of dayColumns) {
    const distance = Math.abs(charPos - col.charPosition);
    if (distance < minDistance) {
      minDistance = distance;
      closest = col;
    }
  }
  if (minDistance > 3) return null;
  return closest;
}

function findClosestToken(
  charPos: number,
  tokenPositions: TokenPosition[]
): TokenPosition | null {
  if (tokenPositions.length === 0) return null;
  let closest = tokenPositions[0]!;
  let minDistance = Math.abs(charPos - closest.position);
  for (const tp of tokenPositions) {
    const distance = Math.abs(charPos - tp.position);
    if (distance < minDistance) {
      minDistance = distance;
      closest = tp;
    }
  }
  return minDistance <= 3 ? closest : null;
}

function deduplicateByPosition(positions: TokenPosition[]): TokenPosition[] {
  const seen = new Set<number>();
  return positions.filter((p) => {
    const key = Math.round(p.position / 2) * 2;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================================
// STEP 6: Build CalendarDay array
// ============================================================

function buildCalendarDays(
  dayColumns: DayColumn[],
  weekdays: Map<number, string>,
  tripAssignments: Map<number, string>,
  destinationMap: Map<number, string>,
  month: number,
  year: number
): CalendarDay[] {
  return dayColumns.map((col, columnIndex) => {
    const dest = destinationMap.get(col.dayOfMonth) ?? null;
    const isSymbol = dest === "*" || dest === "<" || dest === "-";
    return {
      dayOfMonth: col.dayOfMonth,
      month,
      year,
      weekday: weekdays.get(col.dayOfMonth) ?? "",
      tripNumber: tripAssignments.get(col.dayOfMonth) ?? null,
      destination: isSymbol ? null : dest,
      symbol: isSymbol ? dest : null,
      date: new Date(year, month - 1, col.dayOfMonth),
      columnIndex,
    };
  });
}

// ============================================================
// DEBUG: Print alignment (optional)
// ============================================================

export function debugPrintAlignment(
  row1: string,
  row3: string,
  row4: string,
  dayColumns: DayColumn[]
): void {
  /* eslint-disable no-console */
  console.log("=== COLUMN ALIGNMENT DEBUG ===");
  console.log("Day | Pos  | Row3 chars     | Row4 chars");
  console.log("----|------|----------------|----------------");
  for (const col of dayColumns) {
    const pos = col.charPosition;
    const r3slice = row3.substring(
      Math.max(0, pos - 2),
      Math.min(row3.length, pos + 5)
    );
    const r4slice = row4.substring(
      Math.max(0, pos - 2),
      Math.min(row4.length, pos + 5)
    );
    console.log(
      `${String(col.dayOfMonth).padStart(3)} | ${String(pos).padStart(4)} | "${r3slice.padEnd(14)}" | "${r4slice.padEnd(14)}"`
    );
  }
  /* eslint-enable no-console */
}
