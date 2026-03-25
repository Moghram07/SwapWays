/**
 * Orchestrate full schedule parsing: sections → header → footer → pairings → date resolution.
 * Date resolution uses trip order from calendar grid (or Row 3 fallback), roster start day,
 * and cross-month search limit.
 */

import { splitIntoSections } from "./sectionSplitter";
import { parseHeader, extractTripOrder, getTripOrderFromCalendar } from "./headerParser";
import { parseFooterLine } from "./footerParser";
import { parsePairingBlock } from "./pairingParser";
import { resolveAllTripDates } from "./dateResolver";
import type { ParsedSchedule } from "../../types/schedule";

export interface FullParsedSchedule {
  lineNumber: string;
  month: number;
  year: number;
  totalCredit?: number;
  totalBlock?: number;
  daysOff?: number;
  dutyPeriods?: number;
  rosterStartDay?: number;
  trips: ParsedSchedule["trips"];
  rawText: string;
}

/**
 * Parse raw schedule text into ParsedSchedule:
 * 1. Split into header, pairing blocks, footer.
 * 2. Parse header for summary + trip order (Row 3 left-to-right = chronological).
 * 3. Parse each pairing block.
 * 4. Resolve all trip dates using trip order + first-leg day-of-week (no grid).
 */
export function parseScheduleFromText(
  rawText: string,
  monthOverride?: number,
  yearOverride?: number
): FullParsedSchedule {
  const sections = splitIntoSections(rawText);

  let month = monthOverride ?? new Date().getMonth() + 1;
  let year = yearOverride ?? new Date().getFullYear();
  const footer = parseFooterLine(sections.footerLine);
  if (footer) {
    month = footer.month;
    year = footer.year;
  }

  const header = parseHeader(sections.headerLines, month, year);
  const row3 = sections.headerLines[2] ?? "";
  let tripOrder = getTripOrderFromCalendar(header.calendarDays);
  if (tripOrder.length === 0) tripOrder = extractTripOrder(row3);

  const pairings: import("./pairingParser").ParsedPairing[] = [];
  const seenPairingTemplates = new Set<string>();
  for (const block of sections.pairingBlocks) {
    const pairing = parsePairingBlock(block);
    if (!pairing || pairing.legs.length === 0) continue;
    if (seenPairingTemplates.has(pairing.tripNumber)) continue;
    seenPairingTemplates.add(pairing.tripNumber);
    pairings.push(pairing);
  }

  const order = tripOrder.length > 0 ? tripOrder : pairings.map((p) => p.tripNumber);
  const trips = resolveAllTripDates(
    pairings,
    order,
    month,
    year,
    header.rosterStartDay
  );

  return {
    lineNumber: header.lineNumber,
    month,
    year,
    totalCredit: header.creditHours || undefined,
    totalBlock: header.blockHours || undefined,
    daysOff: header.daysOff || undefined,
    dutyPeriods: header.dutyPeriods || undefined,
    rosterStartDay: header.rosterStartDay,
    trips,
    rawText,
  };
}
