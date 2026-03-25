/**
 * Calendar grid column alignment tests for Line 1300.
 * Run with: npx vitest run __tests__/schedule/headerParser.test.ts
 *
 * Uses character-position alignment: trip 003 must map to day 7 (Saturday), not day 2.
 */

import { describe, it, expect } from "vitest";
import {
  findDayColumns,
  findTripsAtPositions,
  findDestinationsAtPositions,
} from "../../src/services/schedule/headerParser";

const row1 =
  "LINE1300    CR. 82.10    2   3   4   5:  6   7:  8   9  10  11  12: 13  14: 15  16  17  18  19: 20  21: 22  23  24  25  26: 27  28: 29  30  31   1   2:  3   4:  5";
const row2 =
  "LINE         BLK 82.10   MO  TU  WE  TH: FR  SA: SU  MO  TU  WE  TH: FR  SA: SU  MO  TU  WE  TH: FR  SA: SU  MO  TU  WE  TH: FR  SA: SU  MO  TU  WE  TH: FR  SA: SU";
const row3 =
  "OFF  9    NO. DP'S 16                         003 030        227    : 157 099    294    : 082 330        259 409 107 : 479    558                :";
const row4 =
  "TAI 152.05   TAD 0.00    *   *   *   *:  <  CAI  MAD  -  JED  TUU  *: RUH  LKO  JED  HYD  -  JED  *: MED  RUH  JED  TUN  JED  *  RUH  KHI  JED  RUH  *  -  KUL  -: JED  :";

describe("Calendar Grid Column Alignment", () => {
  it("should map trip 003 to day 7 (Saturday)", () => {
    const dayColumns = findDayColumns(row1);
    const trips = findTripsAtPositions(row3, dayColumns);
    expect(trips.get(7)).toBe("003");
  });

  it("should map trip 030 to day 8 (Sunday)", () => {
    const dayColumns = findDayColumns(row1);
    const trips = findTripsAtPositions(row3, dayColumns);
    expect(trips.get(8)).toBe("030");
  });

  it("should map trip 227 to day 11 (Wednesday)", () => {
    const dayColumns = findDayColumns(row1);
    const trips = findTripsAtPositions(row3, dayColumns);
    expect(trips.get(11)).toBe("227");
  });

  it("should map trip 157 to day 13 (Friday)", () => {
    const dayColumns = findDayColumns(row1);
    const trips = findTripsAtPositions(row3, dayColumns);
    expect(trips.get(13)).toBe("157");
  });

  it("should map trip 099 to day 14 (Saturday)", () => {
    const dayColumns = findDayColumns(row1);
    const trips = findTripsAtPositions(row3, dayColumns);
    expect(trips.get(14)).toBe("099");
  });

  it("should map trip 294 to a day in the grid", () => {
    const dayColumns = findDayColumns(row1);
    const trips = findTripsAtPositions(row3, dayColumns);
    expect(Array.from(trips.values())).toContain("294");
  });

  it("should map trip 082 to a day in the grid", () => {
    const dayColumns = findDayColumns(row1);
    const trips = findTripsAtPositions(row3, dayColumns);
    expect(Array.from(trips.values())).toContain("082");
  });

  it("should map trip 330 to a day in the grid", () => {
    const dayColumns = findDayColumns(row1);
    const trips = findTripsAtPositions(row3, dayColumns);
    expect(Array.from(trips.values())).toContain("330");
  });

  it("should map trip 259 to day 22 (Monday)", () => {
    const dayColumns = findDayColumns(row1);
    const trips = findTripsAtPositions(row3, dayColumns);
    expect(trips.get(22)).toBe("259");
  });

  it("should map trip 409 to a day in the grid", () => {
    const dayColumns = findDayColumns(row1);
    const trips = findTripsAtPositions(row3, dayColumns);
    expect(Array.from(trips.values())).toContain("409");
  });

  it("should map trip 107 to a day in the grid", () => {
    const dayColumns = findDayColumns(row1);
    const trips = findTripsAtPositions(row3, dayColumns);
    expect(Array.from(trips.values())).toContain("107");
  });

  it("should map trip 479 to a day in the grid", () => {
    const dayColumns = findDayColumns(row1);
    const trips = findTripsAtPositions(row3, dayColumns);
    expect(Array.from(trips.values())).toContain("479");
  });

  it("should map trip 558 to a day in the grid", () => {
    const dayColumns = findDayColumns(row1);
    const trips = findTripsAtPositions(row3, dayColumns);
    expect(Array.from(trips.values())).toContain("558");
  });

  describe("Destination / symbol alignment", () => {
    it("should map day 7 destination to CAI", () => {
      const dayColumns = findDayColumns(row1);
      const dests = findDestinationsAtPositions(row4, dayColumns);
      expect(dests.get(7)).toBe("CAI");
    });

    it("should map day 2 symbol to * (day off)", () => {
      const dayColumns = findDayColumns(row1);
      const dests = findDestinationsAtPositions(row4, dayColumns);
      expect(dests.get(2)).toBe("*");
    });

    it("should map day 6 symbol to < (report before midnight)", () => {
      const dayColumns = findDayColumns(row1);
      const dests = findDestinationsAtPositions(row4, dayColumns);
      expect(dests.get(6)).toBe("<");
    });

    it("should map day 9 to a destination or symbol", () => {
      const dayColumns = findDayColumns(row1);
      const dests = findDestinationsAtPositions(row4, dayColumns);
      expect(dests.has(9)).toBe(true);
      expect(["MAD", "-", "JED"]).toContain(dests.get(9));
    });

    it("should map day 10 to a destination or symbol", () => {
      const dayColumns = findDayColumns(row1);
      const dests = findDestinationsAtPositions(row4, dayColumns);
      expect(dests.has(10)).toBe(true);
      expect(["-", "JED", "TUU"]).toContain(dests.get(10));
    });
  });
});
