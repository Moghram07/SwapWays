import { describe, it, expect } from "vitest";
import { parseCalendarSchedule } from "../../src/services/schedule/calendarParser";

const EMPTY_WEEK = `
Sunday Monday Tuesday Wednesday Thursday Friday Saturday
RR
MD
`.trim();

const SINGLE_TRIP = `
Sunday Monday Tuesday Wednesday Thursday Friday Saturday
7 Mar 2026
Report 22.55
SA0383 JED 00.25 CAI 02.45
SA0382 CAI 04.05 JED 06.15
Release 06.15
Hotel
`.trim();

describe("parseCalendarSchedule", () => {
  it("parses a single-day two-leg trip with hotel continuation", () => {
    const { schedule, metadata } = parseCalendarSchedule(SINGLE_TRIP, 3, 2026);
    expect(schedule.trips.length).toBeGreaterThanOrEqual(1);
    expect(schedule.trips[0]!.legs.length).toBe(2);
    expect(schedule.trips[0]!.creditHours).toBe(0);
    expect(schedule.trips[0]!.tafb).toBe(0);
    expect(schedule.trips[0]!.legs.every((l) => l.aircraftTypeCode === "")).toBe(true);
    expect(metadata.deadHeadLegCount).toBe(0);
  });

  it("skips empty flying weeks but counts reserve-style markers when no duty blocks", () => {
    const { schedule, metadata } = parseCalendarSchedule(EMPTY_WEEK, 3, 2026);
    expect(schedule.trips.length).toBe(0);
    expect(metadata.reserveDayCount + metadata.mandatoryOffCount).toBeGreaterThan(0);
  });
});
