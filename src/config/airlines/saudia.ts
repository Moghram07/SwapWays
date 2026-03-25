import type { AirlineConfig } from "@/types/airline";

export const saudiaConfig: AirlineConfig = {
  name: "Saudia",
  code: "SV",
  emailDomain: "saudia.com",

  ranks: {
    cabin: [
      { code: "HST", name: "Hostess", sortOrder: 1 },
      { code: "STW", name: "Steward", sortOrder: 2 },
      { code: "PC", name: "Purser (Business Class)", sortOrder: 3 },
      { code: "SNF", name: "Senior Flight Attendant", sortOrder: 4 },
      { code: "GD", name: "Guest Director", sortOrder: 5 },
      { code: "CHF", name: "Chef", sortOrder: 6 },
      { code: "BTL", name: "Butler", sortOrder: 7 },
    ],
    flightDeck: [
      { code: "CPT", name: "Captain", sortOrder: 1 },
      { code: "FO", name: "First Officer", sortOrder: 2 },
    ],
  },

  aircraftTypes: [
    { code: "A320", name: "Airbus A320", scheduleCode: "A320" },
    { code: "A321", name: "Airbus A321", scheduleCode: "A321" },
    { code: "A330", name: "Airbus A330", scheduleCode: "A330" },
    { code: "B777", name: "Boeing B777", scheduleCode: "B777" },
    { code: "B787", name: "Boeing B787", scheduleCode: "B787" },
  ],

  bases: [
    { name: "Jeddah", airportCode: "JED" },
    { name: "Riyadh", airportCode: "RUH" },
    { name: "Dammam", airportCode: "DMM" },
    { name: "Madinah", airportCode: "MED" },
  ],

  swapRules: [
    { ruleType: "OVERTIME_LIMIT", description: "Swap would cause crew member to exceed monthly flight hour limit" },
    { ruleType: "NO_PARTIAL_TRADE", description: "Partial trading of reserved (RR) days is not permitted" },
    { ruleType: "DOMESTIC_RESTRICTION", description: "Domestic flights cannot be swapped with international flights" },
    { ruleType: "QUALIFICATION_MISMATCH", description: "Crew member is not type-rated for the aircraft" },
    { ruleType: "BASE_MISMATCH", description: "Crew members must be from the same base" },
    { ruleType: "RANK_MISMATCH", description: "Crew members must hold the same or compatible rank" },
    { ruleType: "REST_VIOLATION", description: "Swap would violate minimum rest period requirements" },
    { ruleType: "SCHEDULE_CONFLICT", description: "Incoming trip conflicts with existing scheduled duties" },
  ],

  scheduleFormat: {
    // Trip: "#259 REPORT AT 01.55Z" or "Trip #259 Report: 01:55Z"
    tripPattern: /#(\d{3})\s+REPORT\s*(?:AT)?\s*[:\s]*(\d{2}[.:]\d{2}Z?)/i,
    // Leg: day, flight (4 digits), aircraft (3–4 chars e.g. A330), depTime, depAirport, arrTime, arrAirport, block
    // NOTE: Deadhead legs may appear as "DH####" in the flight field (e.g. DH0383).
    legPattern: /^([A-Z]{2})\s+((?:DH)?\d{3,4})\s+(\w{3,4})\s+(\d{2}\.\d{2})\s+([A-Z]{3})\s+(\d{2}\.\d{2})\s+([A-Z]{3})\s+(\d{2}\.\d{2})$/,
    // Layover: "LAYOVER CAI 26.10" or "Layover: 26:10" (optional airport)
    layoverPattern: /(?:LAYOVER|Layover:)\s+(?:([A-Z]{3})\s+)?(\d+[.:]\d+)/i,
    creditPattern: /CREDIT:\s+(\d+\.\d+)\s+BLOCK:\s+(\d+\.\d+)\s+TAFB:\s+(\d+\.\d+)/,
  },
};
