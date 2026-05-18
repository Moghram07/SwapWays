import { scoreSwapPost } from "../src/services/matching/swapPostScorer";
import type { ViewerSignals } from "../src/services/matching/viewerSignalsModel";

const signals: ViewerSignals = {
  offeredDates: [],
  offeredDateKeys: new Set(["2026-05-25"]),
  offeredDestinations: ["DXB"],
  offeredTripTypes: new Set(["LAYOVER"]),
  wantedDestinations: [],
  excludedDestinations: [],
  wtfDateKeys: new Set(["2026-05-25", "2026-05-26", "2026-05-27"]),
  wantTypes: ["LAYOVER"],
  hasAnyDestinationFlex: false,
  viewerPostsBlockHoursTotal: 9,
  scheduleTripsByMonth: new Map(),
  hasActivePosts: true,
  hasSchedule: false,
  wantEqualHours: false,
  wantSameDate: false,
  wantMinLayover: null,
  hasExplicitWtfFromPosts: true,
};

const base = {
  wantType: "ANYTHING" as const,
  wantDestinations: ["DXB"],
  wantExclude: [],
  wantMinLayover: null,
  wtfDays: [25, 26],
  quickTripType: null as null,
  quickDestinations: [],
  quickDate: null,
  quickLayoverHours: null,
  advancedBlockHours: null,
};

const turnaroundPost = {
  ...base,
  offeredTrips: [{
    departureDate: new Date("2026-05-26T00:00:00Z"),
    destination: "RUH",
    creditHours: 5,
    blockHours: 5,
    hasLayover: false,
    layoverHours: null,
    tripType: "TURNAROUND" as const,
    scheduleTrip: { legs: [] },
  }],
};

const layoverPost = {
  ...base,
  offeredTrips: [{
    departureDate: new Date("2026-05-26T00:00:00Z"),
    destination: "RUH",
    creditHours: 9,
    blockHours: 9,
    hasLayover: true,
    layoverHours: 24,
    tripType: "LAYOVER" as const,
    scheduleTrip: { legs: [] },
  }],
};

const r1 = scoreSwapPost(signals, turnaroundPost);
console.log("Viewer wants LAYOVER vs TURNAROUND post:", { total: r1.total, reasons: r1.reasons });

const r2 = scoreSwapPost(signals, layoverPost);
console.log("Viewer wants LAYOVER vs LAYOVER post:", { total: r2.total, reasons: r2.reasons });

// Test with ANY_FLIGHT viewer (should match both)
const flexSignals = { ...signals, wantTypes: ["ANY_FLIGHT"] as ["ANY_FLIGHT"], hasAnyDestinationFlex: true };
const r3 = scoreSwapPost(flexSignals, turnaroundPost);
console.log("Viewer ANY_FLIGHT vs TURNAROUND post:", { total: r3.total, reasons: r3.reasons });
