import type { AirlineConfig } from "@/types/airline";

export const flynasConfig: AirlineConfig = {
  name: "flynas",
  code: "XY",
  emailDomain: "flynas.com",

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
    { code: "A320", name: "Airbus A320", scheduleCode: "A320" },
    { code: "A321", name: "Airbus A321", scheduleCode: "A321" },
    { code: "A330", name: "Airbus A330", scheduleCode: "A330" },
  ],

  bases: [
    { name: "Jeddah", airportCode: "JED" },
    { name: "Riyadh", airportCode: "RUH" },
    { name: "Dammam", airportCode: "DMM" },
    { name: "Madinah", airportCode: "MED" },
  ],
};
