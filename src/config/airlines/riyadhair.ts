import type { AirlineConfig } from "@/types/airline";

export const riyadhAirConfig: AirlineConfig = {
  name: "Riyadh Air",
  code: "RX",
  emailDomain: "riyadhair.com",

  ranks: {
    cabin: [
      { code: "CC", name: "Cabin Crew", sortOrder: 1 },
      { code: "SCC", name: "Senior Cabin Crew", sortOrder: 2 },
      { code: "PUR", name: "Purser", sortOrder: 3 },
    ],
    flightDeck: [
      { code: "FIRST OFFICER", name: "First Officer", sortOrder: 1 },
      { code: "CAPTAIN", name: "Captain", sortOrder: 2 },
    ],
  },

  aircraftTypes: [
    { code: "B787", name: "Boeing 787 Dreamliner", scheduleCode: "B787" },
    { code: "B777", name: "Boeing 777", scheduleCode: "B777" },
  ],

  bases: [{ name: "Riyadh", airportCode: "RUH" }],
};
