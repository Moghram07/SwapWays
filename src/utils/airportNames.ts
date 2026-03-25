/**
 * Airport codes with city names and domestic/international flag.
 * Used for display and for trip route type (domestic vs international).
 */

interface AirportInfo {
  city: string;
  isDomestic: boolean;
}

const AIRPORTS: Record<string, AirportInfo> = {
  ABT: { city: "Al Baha", isDomestic: true },
  AHB: { city: "Abha", isDomestic: true },
  AJF: { city: "Jouf", isDomestic: true },
  BHH: { city: "Bisha", isDomestic: true },
  DMM: { city: "Dammam", isDomestic: true },
  DWD: { city: "Dawadmi", isDomestic: true },
  EAM: { city: "Najran", isDomestic: true },
  ELQ: { city: "Gassim", isDomestic: true },
  GIZ: { city: "Jazan", isDomestic: true },
  HAS: { city: "Hail", isDomestic: true },
  JED: { city: "Jeddah", isDomestic: true },
  MED: { city: "Madinah", isDomestic: true },
  NUM: { city: "Neom", isDomestic: true },
  RAE: { city: "Arar", isDomestic: true },
  RAH: { city: "Rafha", isDomestic: true },
  RSI: { city: "Red Sea International", isDomestic: true },
  RUH: { city: "Riyadh", isDomestic: true },
  SHW: { city: "Sharurah", isDomestic: true },
  TUU: { city: "Tabuk", isDomestic: true },
  ULH: { city: "AlUla", isDomestic: true },
  URY: { city: "Gurayat", isDomestic: true },
  WAE: { city: "Wadi Al Dawasir", isDomestic: true },
  YNB: { city: "Yanbu", isDomestic: true },
  ABV: { city: "Abuja", isDomestic: false },
  ADD: { city: "Addis Ababa", isDomestic: false },
  ALG: { city: "Algiers", isDomestic: false },
  AMM: { city: "Amman", isDomestic: false },
  AMS: { city: "Amsterdam", isDomestic: false },
  AQI: { city: "Qaisumah", isDomestic: false },
  AUH: { city: "Abu Dhabi", isDomestic: false },
  BAH: { city: "Manama", isDomestic: false },
  BCN: { city: "Barcelona", isDomestic: false },
  BHX: { city: "Birmingham", isDomestic: false },
  BKK: { city: "Bangkok", isDomestic: false },
  BLR: { city: "Bengaluru", isDomestic: false },
  BOM: { city: "Mumbai", isDomestic: false },
  CAI: { city: "Cairo", isDomestic: false },
  CAN: { city: "Guangzhou", isDomestic: false },
  CDG: { city: "Paris", isDomestic: false },
  CMN: { city: "Casablanca", isDomestic: false },
  COK: { city: "Kochi", isDomestic: false },
  DAC: { city: "Dhaka", isDomestic: false },
  DEL: { city: "New Delhi", isDomestic: false },
  DOH: { city: "Doha", isDomestic: false },
  DPS: { city: "Denpasar", isDomestic: false },
  DXB: { city: "Dubai", isDomestic: false },
  FCO: { city: "Rome", isDomestic: false },
  FRA: { city: "Frankfurt", isDomestic: false },
  GVA: { city: "Geneva", isDomestic: false },
  HBE: { city: "Alexandria", isDomestic: false },
  HYD: { city: "Hyderabad", isDomestic: false },
  IAD: { city: "Washington", isDomestic: false },
  ISB: { city: "Islamabad", isDomestic: false },
  IST: { city: "Istanbul", isDomestic: false },
  JFK: { city: "New York", isDomestic: false },
  KAN: { city: "Kano", isDomestic: false },
  KHI: { city: "Karachi", isDomestic: false },
  KUL: { city: "Kuala Lumpur", isDomestic: false },
  KWI: { city: "Kuwait City", isDomestic: false },
  LGW: { city: "London Gatwick", isDomestic: false },
  LHE: { city: "Lahore", isDomestic: false },
  LHR: { city: "London Heathrow", isDomestic: false },
  LKO: { city: "Lucknow", isDomestic: false },
  LOS: { city: "Lagos", isDomestic: false },
  MAD: { city: "Madrid", isDomestic: false },
  MAN: { city: "Manchester", isDomestic: false },
  MLE: { city: "Malé", isDomestic: false },
  MNL: { city: "Manila", isDomestic: false },
  MRU: { city: "Mauritius", isDomestic: false },
  MUC: { city: "Munich", isDomestic: false },
  MUX: { city: "Multan", isDomestic: false },
  MXP: { city: "Milan Malpensa", isDomestic: false },
  NBO: { city: "Nairobi", isDomestic: false },
  PEW: { city: "Peshawar", isDomestic: false },
  PKX: { city: "Beijing Daxing", isDomestic: false },
  SIN: { city: "Singapore", isDomestic: false },
  SSH: { city: "Sharm El Sheikh", isDomestic: false },
  TUN: { city: "Tunis", isDomestic: false },
  VIE: { city: "Vienna", isDomestic: false },
  YYZ: { city: "Toronto", isDomestic: false },
};

export function getAirportCity(code: string): string {
  return AIRPORTS[code]?.city ?? code;
}

export function getAirportDisplay(code: string): string {
  const info = AIRPORTS[code];
  return info ? `${info.city} (${code})` : code;
}

export function isDomesticAirport(code: string): boolean {
  return AIRPORTS[code]?.isDomestic ?? false;
}

export function isDomesticTrip(
  legs: { departureAirport: string; arrivalAirport: string }[]
): boolean {
  return legs.every(
    (leg) =>
      isDomesticAirport(leg.departureAirport) &&
      isDomesticAirport(leg.arrivalAirport)
  );
}

export function getTripRouteType(
  legs: { departureAirport: string; arrivalAirport: string }[]
): "domestic" | "international" {
  return isDomesticTrip(legs) ? "domestic" : "international";
}

export function getAllAirports(): { code: string; city: string; isDomestic: boolean }[] {
  return Object.entries(AIRPORTS).map(([code, info]) => ({
    code,
    city: info.city,
    isDomestic: info.isDomestic,
  }));
}

