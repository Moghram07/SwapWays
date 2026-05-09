import { describe, it, expect } from "vitest";
import { parseScheduleFromText } from "../../src/services/schedule/scheduleParser";
import { parseCalendarSchedule } from "../../src/services/schedule/calendarParser";
import { normalizeForComparison } from "./normalizeScheduleForComparison";

/** Minimal Mar 2026 line PDF text with only trip #003 (same flying as calendar sample). */
const LINE_SINGLE_TRIP = `LINE1300 CR. 82.10 2 3 4 5: 6 7: 8 9 10 11 12: 13 14: 15 16 17 18 19: 20 21: 22 23 24 25 26: 27 28: 29 30 31 1 2: 3 4: 5
LINE BLK 82.10 MO TU WE TH: FR SA: SU MO TU WE TH: FR SA: SU MO TU WE TH: FR SA: SU MO TU WE TH: FR SA: SU MO TU WE TH: FR SA: SU
OFF 9 NO. DP'S 16 : 003 : : : : : : : : :
TAI 152.05 TAD 0.00 * * * *: < CAI MAD - JED TUU *: RUH LKO JED HYD - JED *: MED RUH JED TUN JED * RUH KHI JED RUH * - KUL -: JED :
TAR 85.40 C/O 16.30
#003 REPORT AT 22.55Z
SA 0383 33R 00.25 JED 02.45 CAI 02.20
SA 0382 33R 04.05 CAI 06.15 JED 02.10
CREDIT: 04.30 BLOCK: 04.30 TAFB: 007.50
Line No. 1300 (JED Economy Cabin Attendant 9 Z) Mar, 2026 PAGE 1 of 1`;

const CALENDAR_SINGLE_TRIP = `
Sunday Monday Tuesday Wednesday Thursday Friday Saturday
7 Mar 2026
Report 22.55
SA0383 JED 00.25 CAI 02.45
SA0382 CAI 04.05 JED 06.15
Release 06.15
Hotel
`.trim();

describe("LINE vs calendar normalized equivalence", () => {
  it("produces matching normalized legs for the same real-world duty", () => {
    const line = parseScheduleFromText(LINE_SINGLE_TRIP);
    const cal = parseCalendarSchedule(CALENDAR_SINGLE_TRIP, 3, 2026);
    const a = normalizeForComparison(line.trips.filter((t) => t.tripNumber === "003"));
    const b = normalizeForComparison(cal.schedule.trips);
    expect(a.length).toBe(1);
    expect(b.length).toBeGreaterThanOrEqual(1);
    expect(a[0]!.legs).toEqual(b[0]!.legs);
  });
});
