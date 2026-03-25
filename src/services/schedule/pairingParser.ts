/**
 * Parse a single pairing (trip) block.
 * First column in each leg line is DAY OF WEEK (SA, FR, SU), not airline code.
 */

import { scheduleTimeToDecimalHours } from "../../utils/timeUtils";

export interface ParsedPairingLeg {
  legOrder: number;
  dayOfWeek: string;
  flightNumber: string;
  aircraftCode: string;
  departureTime: string;
  departureAirport: string;
  arrivalTime: string;
  arrivalAirport: string;
  flyingTimeRaw: string;
  flyingTimeDecimal: number;
  layoverAirport?: string;
  layoverDurationDecimal?: number;
}

export interface ParsedPairingLayover {
  airport: string;
  durationRaw: string;
  durationDecimal: number;
  afterLegOrder: number;
}

export interface ParsedPairing {
  tripNumber: string;
  reportTime: string;
  legs: ParsedPairingLeg[];
  layovers: ParsedPairingLayover[];
  creditHours: number;
  blockHours: number;
  tafb: number;
}

const TRIP_HEADER = /#(\d{3})\s+REPORT\s*(?:AT)?\s*[:\s]*(\d{2}[.:]\d{2}Z?)/i;
// DAY FLIGHT# ACFT DEP_TIME DEP_APT ARR_TIME ARR_APT FLY_TIME  (first col = day of week)
// NOTE: PDF schedules include deadhead legs like: "TU DH1028 333 08.00 JED 09.40 RUH 01.40"
const LEG_LINE = /^([A-Z]{2})\s+((?:DH)?\d{3,4})\s+(\w{3,4})\s+(\d{2}\.\d{2})\s+([A-Z]{3})\s+(\d{2}\.\d{2})\s+([A-Z]{3})\s+(\d{2}\.\d{2})$/;
const LAYOVER_LINE = /(?:LAYOVER|Layover:)\s+(?:([A-Z]{3})\s+)?(\d+[.:]\d+)/i;
const CREDIT_LINE = /CREDIT:\s*(\d+\.\d+)\s+BLOCK:\s*(\d+\.\d+)\s+TAFB:\s*(\d+\.\d+)/i;
// TAFB can be 3-digit hours: TAFB: 065.10
const CREDIT_LINE_TAFB3 = /CREDIT:\s*(\d+\.\d+)\s+BLOCK:\s*(\d+\.\d+)\s+TAFB:\s*(\d{3}\.\d+)/i;

export function parsePairingBlock(block: string): ParsedPairing | null {
  const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const headerMatch = lines[0]!.match(TRIP_HEADER);
  if (!headerMatch) return null;
  const tripNumber = headerMatch[1]!;
  const reportTime = (headerMatch[2] ?? "").replace(":", ".") + (headerMatch[2]?.endsWith("Z") ? "" : "Z");

  const legs: ParsedPairingLeg[] = [];
  const layovers: ParsedPairingLayover[] = [];
  let creditHours = 0;
  let blockHours = 0;
  let tafb = 0;
  let legOrder = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;

    const legMatch = line.match(LEG_LINE);
    if (legMatch) {
      legOrder++;
      const [, dayOfWeek, flightNum, aircraft, depTime, depAirport, arrTime, arrAirport, flyTimeRaw] = legMatch;
      const flyingTimeDecimal = scheduleTimeToDecimalHours(flyTimeRaw ?? "0");
      legs.push({
        legOrder,
        dayOfWeek: (dayOfWeek ?? "").toUpperCase(),
        flightNumber: flightNum ?? "",
        aircraftCode: aircraft ?? "",
        departureTime: depTime ?? "",
        departureAirport: depAirport ?? "",
        arrivalTime: arrTime ?? "",
        arrivalAirport: arrAirport ?? "",
        flyingTimeRaw: flyTimeRaw ?? "",
        flyingTimeDecimal,
      });
      continue;
    }

    const layoverMatch = line.match(LAYOVER_LINE);
    if (layoverMatch) {
      const [, airport, durationRaw] = layoverMatch;
      const durationDecimal = scheduleTimeToDecimalHours(durationRaw ?? "0");
      const apt = (airport ?? "").toUpperCase();
      layovers.push({
        airport: apt,
        durationRaw: durationRaw ?? "",
        durationDecimal,
        afterLegOrder: legOrder,
      });
      if (legs.length > 0) {
        const prev = legs[legs.length - 1]!;
        prev.layoverAirport = apt;
        prev.layoverDurationDecimal = durationDecimal;
      }
      continue;
    }

    let creditMatch = line.match(CREDIT_LINE_TAFB3);
    if (creditMatch) {
      creditHours = scheduleTimeToDecimalHours(creditMatch[1]!);
      blockHours = scheduleTimeToDecimalHours(creditMatch[2]!);
      tafb = scheduleTimeToDecimalHours(creditMatch[3]!);
      break;
    }
    creditMatch = line.match(CREDIT_LINE);
    if (creditMatch) {
      creditHours = scheduleTimeToDecimalHours(creditMatch[1]!);
      blockHours = scheduleTimeToDecimalHours(creditMatch[2]!);
      tafb = scheduleTimeToDecimalHours(creditMatch[3]!);
      break;
    }
  }

  return {
    tripNumber,
    reportTime,
    legs,
    layovers,
    creditHours,
    blockHours,
    tafb,
  };
}
