/**
 * LINE 1300 full schedule validation — all three parser bugs fixed.
 * Run: npx vitest run __tests__/schedule/fullScheduleValidation.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { parseScheduleFromText } from "../../src/services/schedule/scheduleParser";

const RAW_TEXT = `LINE1300 CR. 82.10 2 3 4 5: 6 7: 8 9 10 11 12: 13 14: 15 16 17 18 19: 20 21: 22 23 24 25 26: 27 28: 29 30 31 1 2: 3 4: 5
LINE BLK 82.10 MO TU WE TH: FR SA: SU MO TU WE TH: FR SA: SU MO TU WE TH: FR SA: SU MO TU WE TH: FR SA: SU MO TU WE TH: FR SA: SU
OFF 9 NO. DP'S 16 : 003 030 227 : 157 099 294 : 082 330 259 409 107 : 479 558 : :
TAI 152.05 TAD 0.00 * * * *: < CAI MAD - JED TUU *: RUH LKO JED HYD - JED *: MED RUH JED TUN JED * RUH KHI JED RUH * - KUL -: JED :
TAR 85.40 C/O 16.30
#003 REPORT AT 22.55Z
SA 0383 33R 00.25 JED 02.45 CAI 02.20
SA 0382 33R 04.05 CAI 06.15 JED 02.10
CREDIT: 04.30 BLOCK: 04.30 TAFB: 007.50
#030 REPORT AT 03.35Z
SU 0227 789 05.05 JED 11.45 MAD 06.40
LAYOVER MAD 50.40
TU 0220 789 14.25 MAD 20.15 JED 05.50
CREDIT: 12.30 BLOCK: 12.30 TAFB: 065.10
#082 REPORT AT 12.10Z
FR 1428 32N 13.40 JED 14.40 MED 01.00
FR 1429 32N 15.40 MED 16.50 JED 01.10
FR 1856 32N 18.10 JED 19.45 EAM 01.35
FR 1857 32N 20.40 EAM 22.15 JED 01.35
CREDIT: 05.20 BLOCK: 05.20 TAFB: 010.35
#099 REPORT AT 12.35Z
SA 0892 33D 14.05 JED 19.20 LKO 05.15
SA 0893 33D 21.00 LKO 03.45 JED 06.45
CREDIT: 12.00 BLOCK: 12.00 TAFB: 015.40
#107 REPORT AT 15.05Z
FR 0704 77U 16.35 JED 20.20 KHI 03.45
FR 0705 77U 22.05 KHI 02.40 JED 04.35
CREDIT: 08.20 BLOCK: 08.20 TAFB: 012.05
#157 REPORT AT 01.30Z
FR 1018 33R 03.00 JED 04.40 RUH 01.40
FR 1029 33R 08.00 RUH 09.55 JED 01.55
CREDIT: 03.35 BLOCK: 03.35 TAFB: 008.55
#227 REPORT AT 17.45Z
WE 1539 323 19.15 JED 20.50 TUU 01.35
WE 1540 323 21.35 TUU 23.15 JED 01.40
CREDIT: 03.15 BLOCK: 03.15 TAFB: 006.00
#259 REPORT AT 01.55Z
MO 0365 33R 03.25 JED 08.30 TUN 05.05
LAYOVER TUN 26.10
TU 0366 333 10.40 TUN 14.55 JED 04.15
CREDIT: 09.20 BLOCK: 09.20 TAFB: 037.30
#294 REPORT AT 12.30Z
MO 0752 33D 14.00 JED 19.10 HYD 05.10
LAYOVER HYD 34.45
WE 0755 33D 05.55 HYD 12.20 JED 06.25
CREDIT: 11.35 BLOCK: 11.35 TAFB: 048.20
#330 REPORT AT 19.25Z
SA 1054 32N 20.55 JED 22.35 RUH 01.40
SU 1017 32U 01.55 RUH 03.50 JED 01.55
CREDIT: 03.35 BLOCK: 03.35 TAFB: 008.55
#409 REPORT AT 04.30Z
TH 1024 77H 06.00 JED 07.40 RUH 01.40
TH 1073 77H 10.30 RUH 12.25 JED 01.55
CREDIT: 03.35 BLOCK: 03.35 TAFB: 008.25
#479 REPORT AT 15.00Z
SU 1084 32N 16.30 JED 18.15 RUH 01.45
SU 1053 33R 20.00 RUH 21.45 JED 01.45
CREDIT: 03.30 BLOCK: 03.30 TAFB: 007.15
#558 REPORT AT 21.25Z
TU 0834 780 22.55 JED 07.55 KUL 09.00
LAYOVER KUL 34.20
TH 0841 780 18.15 KUL 02.50 JED 08.35
CREDIT: 17.35 BLOCK: 01.05 TAFB: 053.55
Line No. 1300 (JED Economy Cabin Attendant 9 Z) Mar, 2026 PAGE 1 of 1`;

describe("LINE 1300 Complete Schedule Validation", () => {
  let schedule: ReturnType<typeof parseScheduleFromText>;

  beforeAll(() => {
    schedule = parseScheduleFromText(RAW_TEXT);
  });

  it("should find exactly 13 trips", () => {
    expect(schedule.trips.length).toBe(13);
  });

  it("should find exactly 28 total flight legs", () => {
    const totalLegs = schedule.trips.reduce((sum, t) => sum + t.legs.length, 0);
    expect(totalLegs).toBe(28);
  });

  const expectedStartDates: Record<string, string> = {
    "003": "2026-03-07",
    "030": "2026-03-08",
    "227": "2026-03-11",
    "157": "2026-03-13",
    "099": "2026-03-14",
    "294": "2026-03-16",
    "082": "2026-03-20",
    "330": "2026-03-21",
    "259": "2026-03-23",
    "409": "2026-03-26",
    "107": "2026-03-27",
    "479": "2026-03-29",
    "558": "2026-03-31",
  };

  for (const [tripNum, expectedDate] of Object.entries(expectedStartDates)) {
    it(`Trip #${tripNum} should start on ${expectedDate}`, () => {
      const trip = schedule.trips.find((t) => t.tripNumber === tripNum);
      expect(trip).toBeDefined();
      const startDateStr = trip!.legs[0]!.departureDate!.toISOString().split("T")[0];
      expect(startDateStr).toBe(expectedDate);
    });
  }

  it("Trip #003: BOTH legs should depart on March 7", () => {
    const trip = schedule.trips.find((t) => t.tripNumber === "003");
    expect(trip!.legs[0]!.departureDate!.toISOString().split("T")[0]).toBe("2026-03-07");
    expect(trip!.legs[1]!.departureDate!.toISOString().split("T")[0]).toBe("2026-03-07");
  });

  it("Trip #030: leg 1 on March 8, leg 2 on March 10", () => {
    const trip = schedule.trips.find((t) => t.tripNumber === "030");
    expect(trip!.legs[0]!.departureDate!.toISOString().split("T")[0]).toBe("2026-03-08");
    expect(trip!.legs[1]!.departureDate!.toISOString().split("T")[0]).toBe("2026-03-10");
  });

  it("Trip #259: should NOT be on March 11", () => {
    const trip = schedule.trips.find((t) => t.tripNumber === "259");
    const startStr = trip!.legs[0]!.departureDate!.toISOString().split("T")[0];
    expect(startStr).not.toBe("2026-03-11");
    expect(startStr).toBe("2026-03-23");
  });

  it("Trip #294: leg 1 on March 16, leg 2 on March 18", () => {
    const trip = schedule.trips.find((t) => t.tripNumber === "294");
    expect(trip!.legs[0]!.departureDate!.toISOString().split("T")[0]).toBe("2026-03-16");
    expect(trip!.legs[1]!.departureDate!.toISOString().split("T")[0]).toBe("2026-03-18");
  });

  it("Trip #330: leg 1 on March 21, leg 2 on March 22", () => {
    const trip = schedule.trips.find((t) => t.tripNumber === "330");
    expect(trip!.legs[0]!.departureDate!.toISOString().split("T")[0]).toBe("2026-03-21");
    expect(trip!.legs[1]!.departureDate!.toISOString().split("T")[0]).toBe("2026-03-22");
  });

  it("Trip #082: ALL 4 legs should depart on March 20", () => {
    const trip = schedule.trips.find((t) => t.tripNumber === "082");
    for (const leg of trip!.legs) {
      expect(leg.departureDate!.toISOString().split("T")[0]).toBe("2026-03-20");
    }
  });

  it("Trip #558: leg 1 on March 31, leg 2 on April 2", () => {
    const trip = schedule.trips.find((t) => t.tripNumber === "558");
    expect(trip!.legs[0]!.departureDate!.toISOString().split("T")[0]).toBe("2026-03-31");
    expect(trip!.legs[1]!.departureDate!.toISOString().split("T")[0]).toBe("2026-04-02");
  });

  it("Trip #003: JED→CAI→JED on 33R", () => {
    const trip = schedule.trips.find((t) => t.tripNumber === "003");
    expect(trip!.legs[0]!.departureAirport).toBe("JED");
    expect(trip!.legs[0]!.arrivalAirport).toBe("CAI");
    expect(trip!.legs[0]!.aircraftTypeCode).toBe("33R");
    expect(trip!.legs[1]!.departureAirport).toBe("CAI");
    expect(trip!.legs[1]!.arrivalAirport).toBe("JED");
  });

  it("Trip #082: should have 4 legs (MED + EAM)", () => {
    const trip = schedule.trips.find((t) => t.tripNumber === "082");
    expect(trip!.legs.length).toBe(4);
    expect(trip!.legs[0]!.arrivalAirport).toBe("MED");
    expect(trip!.legs[2]!.arrivalAirport).toBe("EAM");
  });

  it("March 7 should show only Trip 003 legs", () => {
    const mar7From003 = schedule.trips
      .find((t) => t.tripNumber === "003")!
      .legs.filter((l) => l.departureDate!.toISOString().split("T")[0] === "2026-03-07");
    const mar7From030 = schedule.trips
      .find((t) => t.tripNumber === "030")!
      .legs.filter((l) => l.departureDate!.toISOString().split("T")[0] === "2026-03-07");
    expect(mar7From003.length).toBe(2);
    expect(mar7From030.length).toBe(0);
  });

  it("March 11 should show Trip 227 only, not Trip 259", () => {
    const trip227 = schedule.trips.find((t) => t.tripNumber === "227")!;
    const trip259 = schedule.trips.find((t) => t.tripNumber === "259")!;
    const mar11From227 = trip227.legs.filter(
      (l) => l.departureDate!.toISOString().split("T")[0] === "2026-03-11"
    );
    const mar11From259 = trip259.legs.filter(
      (l) => l.departureDate!.toISOString().split("T")[0] === "2026-03-11"
    );
    expect(mar11From227.length).toBe(2);
    expect(mar11From259.length).toBe(0);
  });
});
