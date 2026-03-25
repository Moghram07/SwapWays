/**
 * UTC offset in hours for each airport (STANDARD time, no DST).
 * Crew scheduling uses standard time for consistency.
 */

const AIRPORT_UTC_OFFSETS: Record<string, number> = {
  // DOMESTIC — Saudi Arabia is UTC+3 (no DST)
  ABT: 3, AHB: 3, AJF: 3, BHH: 3, DMM: 3, DWD: 3,
  EAM: 3, ELQ: 3, GIZ: 3, HAS: 3, JED: 3, MED: 3,
  NUM: 3, RAE: 3, RAH: 3, RSI: 3, RUH: 3, SHW: 3,
  TUU: 3, ULH: 3, URY: 3, WAE: 3, YNB: 3,

  // MIDDLE EAST
  AMM: 2, AUH: 4, BAH: 3, DOH: 3, DXB: 4, KWI: 3,

  // AFRICA
  ABV: 1, ADD: 3, ALG: 1, CAI: 2, CMN: 1, HBE: 2,
  KAN: 1, LOS: 1, NBO: 3, SSH: 2, TUN: 1, MRU: 4,

  // SOUTH ASIA
  BLR: 5.5, BOM: 5.5, COK: 5.5, DAC: 6, DEL: 5.5,
  HYD: 5.5, ISB: 5, KHI: 5, LHE: 5, LKO: 5.5,
  MUX: 5, PEW: 5, MLE: 5, CMB: 5.5,

  // SOUTHEAST ASIA
  BKK: 7, DPS: 8, KUL: 8, MNL: 8, SIN: 8,

  // EAST ASIA
  CAN: 8, PKX: 8,

  // EUROPE
  AMS: 1, BCN: 1, BHX: 0, CDG: 1, FCO: 1, FRA: 1,
  GVA: 1, IST: 3, LGW: 0, LHR: 0, MAD: 1, MAN: 0,
  MUC: 1, MXP: 1, VIE: 1,

  // NORTH AMERICA
  IAD: -5, JFK: -5, YYZ: -5,
};

export function getAirportUtcOffset(code: string): number {
  return AIRPORT_UTC_OFFSETS[code] ?? 0;
}

export interface ZuluToLocalResult {
  localTime: string;
  offset: string;
  label: string;
  nextDay: boolean;
}

/**
 * Convert a Zulu time string to local time at a given airport.
 * @param zuluTime - Time in schedule format "HH.MM" or "HH.MMZ"
 * @param airportCode - IATA airport code
 */
export function zuluToLocal(
  zuluTime: string,
  airportCode: string
): ZuluToLocalResult {
  const clean = (zuluTime ?? "").replace("Z", "").trim();
  const parts = clean.split(".");
  const zuluHours = parseInt(parts[0] ?? "0", 10) || 0;
  const zuluMinutes = parseInt(parts[1] ?? "0", 10) || 0;

  const utcOffset = getAirportUtcOffset(airportCode);
  let localTotalMinutes = zuluHours * 60 + zuluMinutes + utcOffset * 60;

  let nextDay = false;
  if (localTotalMinutes >= 1440) {
    localTotalMinutes -= 1440;
    nextDay = true;
  } else if (localTotalMinutes < 0) {
    localTotalMinutes += 1440;
  }

  const localHours = Math.floor(localTotalMinutes / 60);
  const localMins = Math.round(localTotalMinutes % 60);

  const localTime = `${localHours.toString().padStart(2, "0")}:${localMins.toString().padStart(2, "0")}`;

  const period = localHours >= 12 ? "PM" : "AM";
  const displayHour = localHours === 0 ? 12 : localHours > 12 ? localHours - 12 : localHours;
  const label = `${displayHour}:${localMins.toString().padStart(2, "0")} ${period}`;

  const offsetSign = utcOffset >= 0 ? "+" : "";
  const offsetStr = Number.isInteger(utcOffset)
    ? `${offsetSign}${utcOffset}`
    : `${offsetSign}${Math.floor(utcOffset)}:${Math.round((utcOffset % 1) * 60)}`;

  return { localTime, offset: offsetStr, label, nextDay };
}

/**
 * Format a display string showing both Zulu and local time.
 * Example: "15:30Z (11:30 PM local)"
 */
export function formatDualTime(zuluTime: string, airportCode: string): string {
  const zulu = (zuluTime ?? "").replace(".", ":").replace("Z", "").trim() + "Z";
  const local = zuluToLocal(zuluTime, airportCode);
  return `${zulu} (${local.label} local)`;
}

export interface LocalDateParts {
  year: number;
  month: number;
  day: number;
}

/**
 * Given a schedule date (UTC day), a Zulu time string, and an airport code,
 * return the local calendar date (year, month, day) at that airport.
 * Use when displaying dates alongside local times so date and time match.
 */
export function getLocalDateFromZulu(
  date: Date,
  zuluTime: string,
  airportCode: string
): LocalDateParts {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const clean = (zuluTime ?? "").replace("Z", "").trim();
  const parts = clean.split(".");
  const zuluHours = parseInt(parts[0] ?? "0", 10) || 0;
  const zuluMinutes = parseInt(parts[1] ?? "0", 10) || 0;
  const minutesFromMidnight = zuluHours * 60 + zuluMinutes;
  const utcMs =
    Date.UTC(y, m, d) + minutesFromMidnight * 60 * 1000;
  const offsetHours = getAirportUtcOffset(airportCode);
  const localDayNum = Math.floor(
    (utcMs + offsetHours * 3600 * 1000) / 86400000
  );
  const localDayStart = new Date(localDayNum * 86400000);
  return {
    year: localDayStart.getUTCFullYear(),
    month: localDayStart.getUTCMonth(),
    day: localDayStart.getUTCDate(),
  };
}
