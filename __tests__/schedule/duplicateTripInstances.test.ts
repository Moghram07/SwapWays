import { describe, expect, it } from "vitest";
import { getTripOrderFromCalendar, type CalendarDay } from "../../src/services/schedule/headerParser";
import { resolveAllTripDates } from "../../src/services/schedule/dateResolver";
import type { ParsedPairing } from "../../src/services/schedule/pairingParser";

function day(month: number, date: number): Date {
  return new Date(Date.UTC(2026, month - 1, date, 12, 0, 0, 0));
}

describe("duplicate trip instances", () => {
  it("keeps non-consecutive duplicates in trip order", () => {
    const calendarDays: CalendarDay[] = [
      { dayOfMonth: 2, month: 3, year: 2026, weekday: "MO", tripNumber: "005", destination: null, symbol: null, date: day(3, 2), columnIndex: 0 },
      { dayOfMonth: 3, month: 3, year: 2026, weekday: "TU", tripNumber: "005", destination: null, symbol: null, date: day(3, 3), columnIndex: 1 },
      { dayOfMonth: 4, month: 3, year: 2026, weekday: "WE", tripNumber: "241", destination: null, symbol: null, date: day(3, 4), columnIndex: 2 },
      { dayOfMonth: 5, month: 3, year: 2026, weekday: "TH", tripNumber: "341", destination: null, symbol: null, date: day(3, 5), columnIndex: 3 },
      { dayOfMonth: 6, month: 3, year: 2026, weekday: "FR", tripNumber: "241", destination: null, symbol: null, date: day(3, 6), columnIndex: 4 },
    ];

    expect(getTripOrderFromCalendar(calendarDays)).toEqual(["005", "241", "341", "241"]);
  });

  it("resolves one trip per order entry and assigns instance ids", () => {
    const pairings: ParsedPairing[] = [
      {
        tripNumber: "241",
        reportTime: "04.00Z",
        legs: [
          {
            legOrder: 1,
            dayOfWeek: "WE",
            flightNumber: "0700",
            aircraftCode: "77W",
            departureTime: "06.00",
            departureAirport: "JED",
            arrivalTime: "09.00",
            arrivalAirport: "KHI",
            flyingTimeRaw: "03.00",
            flyingTimeDecimal: 3,
          },
        ],
        layovers: [],
        creditHours: 3,
        blockHours: 3,
        tafb: 6,
      },
      {
        tripNumber: "341",
        reportTime: "04.00Z",
        legs: [
          {
            legOrder: 1,
            dayOfWeek: "SA",
            flightNumber: "0341",
            aircraftCode: "320",
            departureTime: "07.00",
            departureAirport: "JED",
            arrivalTime: "09.00",
            arrivalAirport: "RUH",
            flyingTimeRaw: "02.00",
            flyingTimeDecimal: 2,
          },
        ],
        layovers: [],
        creditHours: 2,
        blockHours: 2,
        tafb: 4,
      },
    ];

    const resolved = resolveAllTripDates(pairings, ["241", "341", "241"], 3, 2026, 18);
    const for241 = resolved.filter((t) => t.tripNumber === "241");

    expect(resolved.length).toBe(3);
    expect(for241.map((t) => t.instanceId)).toEqual(["241", "241_2"]);
    expect(for241[0]?.legs[0]?.departureDate?.toISOString().slice(0, 10)).toBe("2026-03-18");
    expect(for241[1]?.legs[0]?.departureDate?.toISOString().slice(0, 10)).toBe("2026-03-25");
  });
});
