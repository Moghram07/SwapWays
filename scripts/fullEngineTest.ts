import { scoreSwapPost } from "../src/services/matching/swapPostScorer";
import type { ViewerSignals } from "../src/services/matching/viewerSignalsModel";
import type { PostLike } from "../src/services/matching/softScoring";

const BASE_POST: PostLike = {
  wantType: "ANYTHING",
  wantDestinations: [],
  wantExclude: [],
  wantMinLayover: null,
  wtfDays: [],
  quickTripType: null,
  quickDestinations: [],
  quickDate: null,
  quickLayoverHours: null,
  advancedBlockHours: null,
  offeredTrips: [],
};

const BASE_SIG: ViewerSignals = {
  offeredDates: [],
  offeredDateKeys: new Set(["2026-05-25"]),
  offeredDestinations: ["DXB"],
  offeredTripTypes: new Set(["LAYOVER"]),
  wantedDestinations: ["RUH"],
  excludedDestinations: [],
  wtfDateKeys: new Set(["2026-05-25", "2026-05-26"]),
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

function trip(dest: string, type: "LAYOVER" | "TURNAROUND" | "MULTI_STOP", date = "2026-05-25") {
  return {
    departureDate: new Date(date + "T00:00:00Z"),
    destination: dest,
    creditHours: 9,
    blockHours: 9,
    hasLayover: type === "LAYOVER",
    layoverHours: type === "LAYOVER" ? 24 : null,
    tripType: type,
    scheduleTrip: null,
  };
}

type Case = { label: string; signals: ViewerSignals; post: PostLike; expectedScore?: number };

const tests: Case[] = [
  // ─── F1: Poster offered → viewer's wanted city ───────────────────────────
  {
    label: "F1=35 exact: poster offers RUH (viewer wants RUH)",
    signals: { ...BASE_SIG, wantedDestinations: ["RUH"] },
    post: { ...BASE_POST, offeredTrips: [trip("RUH", "LAYOVER")], wantDestinations: ["DXB"], wantType: "SPECIFIC" },
    expectedScore: 100, // F1=35 + F2=35 + F3=30 = 100 × 1.0 (both dirs align)
  },
  {
    label: "F1=25 flex: viewer is ANYTHING (no wanted list, hasAnyDestinationFlex=true)",
    signals: { ...BASE_SIG, wantedDestinations: [], hasAnyDestinationFlex: true, wantTypes: ["ANYTHING"] },
    post: { ...BASE_POST, offeredTrips: [trip("JED", "LAYOVER")], wantDestinations: ["DXB"], wantType: "SPECIFIC" },
  },
  {
    label: "F1=0: poster offers dest not in viewer's want list",
    signals: { ...BASE_SIG, wantedDestinations: ["KAN"] },
    post: { ...BASE_POST, offeredTrips: [trip("RUH", "LAYOVER")], wantDestinations: ["DXB"], wantType: "SPECIFIC" },
  },

  // ─── F2: Viewer offered → poster's wanted city ───────────────────────────
  {
    label: "F2=35 exact: viewer offers DXB, poster wants DXB",
    signals: { ...BASE_SIG, wantedDestinations: [], offeredDestinations: ["DXB"] },
    post: { ...BASE_POST, offeredTrips: [trip("RUH", "LAYOVER")], wantDestinations: ["DXB"], wantType: "SPECIFIC" },
  },
  {
    label: "F2=25 flexible poster: poster wantType=ANYTHING",
    signals: { ...BASE_SIG, wantedDestinations: [], offeredDestinations: ["KAN"] },
    post: { ...BASE_POST, offeredTrips: [trip("RUH", "LAYOVER")], wantDestinations: [], wantType: "ANYTHING" },
  },
  {
    label: "F2=0: viewer offers KAN, poster wants DXB only",
    signals: { ...BASE_SIG, wantedDestinations: [], offeredDestinations: ["KAN"] },
    post: { ...BASE_POST, offeredTrips: [trip("RUH", "LAYOVER")], wantDestinations: ["DXB"], wantType: "SPECIFIC" },
  },

  // ─── F3: Trip type compatibility ──────────────────────────────────────────
  {
    label: "F3=30: viewer wants LAYOVER, post is LAYOVER",
    signals: { ...BASE_SIG, wantTypes: ["LAYOVER"], wantedDestinations: [] },
    post: { ...BASE_POST, offeredTrips: [trip("RUH", "LAYOVER")], wantDestinations: ["DXB"], wantType: "SPECIFIC" },
  },
  {
    label: "F3=0: viewer wants LAYOVER, post is TURNAROUND",
    signals: { ...BASE_SIG, wantTypes: ["LAYOVER"], wantedDestinations: [] },
    post: { ...BASE_POST, offeredTrips: [trip("RUH", "TURNAROUND")], wantDestinations: ["DXB"], wantType: "SPECIFIC" },
  },
  {
    label: "F3=30: viewer wants ROUND_TRIP, post is TURNAROUND",
    signals: { ...BASE_SIG, wantTypes: ["ROUND_TRIP"], wantedDestinations: [] },
    post: { ...BASE_POST, offeredTrips: [trip("RUH", "TURNAROUND")], wantDestinations: ["DXB"], wantType: "SPECIFIC" },
  },
  {
    label: "F3=0: viewer wants ROUND_TRIP, post is LAYOVER",
    signals: { ...BASE_SIG, wantTypes: ["ROUND_TRIP"], wantedDestinations: [] },
    post: { ...BASE_POST, offeredTrips: [trip("RUH", "LAYOVER")], wantDestinations: ["DXB"], wantType: "SPECIFIC" },
  },
  {
    label: "F3=0: viewer wants ROUND_TRIP, post is MULTI_STOP",
    signals: { ...BASE_SIG, wantTypes: ["ROUND_TRIP"], wantedDestinations: [] },
    post: { ...BASE_POST, offeredTrips: [trip("RUH", "MULTI_STOP")], wantDestinations: ["DXB"], wantType: "SPECIFIC" },
  },
  {
    label: "F3=30: viewer ANY_FLIGHT (flex) vs LAYOVER post",
    signals: { ...BASE_SIG, wantTypes: ["ANY_FLIGHT"], hasAnyDestinationFlex: true, wantedDestinations: [] },
    post: { ...BASE_POST, offeredTrips: [trip("RUH", "LAYOVER")], wantDestinations: ["DXB"], wantType: "SPECIFIC" },
  },
  {
    label: "F3=30: viewer ANY_FLIGHT (flex) vs TURNAROUND post",
    signals: { ...BASE_SIG, wantTypes: ["ANY_FLIGHT"], hasAnyDestinationFlex: true, wantedDestinations: [] },
    post: { ...BASE_POST, offeredTrips: [trip("RUH", "TURNAROUND")], wantDestinations: ["DXB"], wantType: "SPECIFIC" },
  },
  {
    label: "F3=30: viewer ANY_FLIGHT (flex) vs MULTI_STOP post",
    signals: { ...BASE_SIG, wantTypes: ["ANY_FLIGHT"], hasAnyDestinationFlex: true, wantedDestinations: [] },
    post: { ...BASE_POST, offeredTrips: [trip("RUH", "MULTI_STOP")], wantDestinations: ["DXB"], wantType: "SPECIFIC" },
  },

  // ─── Date multiplier ──────────────────────────────────────────────────────
  {
    label: "Date ×1.0: both A and B align",
    signals: { ...BASE_SIG, wtfDateKeys: new Set(["2026-05-25"]), offeredDateKeys: new Set(["2026-05-26"]) },
    post: { ...BASE_POST, offeredTrips: [trip("RUH", "LAYOVER", "2026-05-25")], wtfDays: [26], wantDestinations: ["DXB"], wantType: "SPECIFIC" },
  },
  {
    label: "Date ×0.5: only A aligns (poster date on viewer WTF)",
    signals: { ...BASE_SIG, wtfDateKeys: new Set(["2026-05-25"]), offeredDateKeys: new Set(["2026-06-01"]) },
    post: { ...BASE_POST, offeredTrips: [trip("RUH", "LAYOVER", "2026-05-25")], wtfDays: [5], wantDestinations: ["DXB"], wantType: "SPECIFIC" },
  },
  {
    label: "Date ×0.5: only B aligns (viewer date on poster WTF)",
    signals: { ...BASE_SIG, wtfDateKeys: new Set(["2026-06-01"]), offeredDateKeys: new Set(["2026-05-25"]) },
    post: { ...BASE_POST, offeredTrips: [trip("RUH", "LAYOVER", "2026-05-10")], wtfDays: [25], wantDestinations: ["DXB"], wantType: "SPECIFIC" },
  },
  {
    label: "Date ×0.25: neither A nor B aligns",
    signals: { ...BASE_SIG, wtfDateKeys: new Set(["2026-05-01"]), offeredDateKeys: new Set(["2026-05-01"]) },
    post: { ...BASE_POST, offeredTrips: [trip("RUH", "LAYOVER", "2026-05-25")], wtfDays: [10], wantDestinations: ["DXB"], wantType: "SPECIFIC" },
  },
  {
    label: "Date ×1.0: viewer has NO WTF days (accepts any date)",
    signals: { ...BASE_SIG, wtfDateKeys: new Set(), hasExplicitWtfFromPosts: false },
    post: { ...BASE_POST, offeredTrips: [trip("RUH", "LAYOVER", "2099-12-01")], wtfDays: [], wantDestinations: ["DXB"], wantType: "SPECIFIC" },
  },
  {
    label: "Date ×1.0: poster has NO WTF days (accepts any viewer date)",
    signals: { ...BASE_SIG, wtfDateKeys: new Set(["2026-05-25"]), offeredDateKeys: new Set(["2099-01-01"]) },
    post: { ...BASE_POST, offeredTrips: [trip("RUH", "LAYOVER", "2026-05-25")], wtfDays: [], wantDestinations: ["DXB"], wantType: "SPECIFIC" },
  },

  // ─── Perfect score ────────────────────────────────────────────────────────
  {
    label: "PERFECT 100: F1=35 + F2=35 + F3=30 + date ×1.0",
    signals: {
      ...BASE_SIG,
      wantedDestinations: ["RUH"],
      offeredDestinations: ["DXB"],
      wantTypes: ["LAYOVER"],
      wtfDateKeys: new Set(["2026-05-25"]),
      offeredDateKeys: new Set(["2026-05-26"]),
    },
    post: {
      ...BASE_POST,
      offeredTrips: [trip("RUH", "LAYOVER", "2026-05-25")],
      wantDestinations: ["DXB"],
      wantType: "SPECIFIC",
      wtfDays: [26],
    },
    expectedScore: 100,
  },

  // ─── Score = 0 cases ──────────────────────────────────────────────────────
  {
    label: "Score 0: F1=0 + F2=0 + F3=0 (complete mismatch)",
    signals: { ...BASE_SIG, wantedDestinations: ["KAN"], offeredDestinations: ["KAN"], wantTypes: ["LAYOVER"] },
    post: { ...BASE_POST, offeredTrips: [trip("DMM", "TURNAROUND")], wantDestinations: ["AUH"], wantType: "SPECIFIC" },
    expectedScore: 0,
  },
];

let passed = 0;
let failed = 0;

for (const t of tests) {
  const r = scoreSwapPost(t.signals, t.post);
  const expectedOk = t.expectedScore === undefined || r.total === t.expectedScore;
  const icon = expectedOk ? "✅" : "❌";
  if (expectedOk) passed++; else failed++;
  console.log(`${icon} ${t.label}`);
  console.log(`   score=${r.total}  reasons=[${r.reasons.join(" | ")}]`);
  if (!expectedOk) console.log(`   EXPECTED score=${t.expectedScore}`);
}

console.log(`\n${"─".repeat(60)}`);
console.log(`RESULT: ${passed} passed, ${failed} failed out of ${tests.length} tests`);
if (failed === 0) console.log("ENGINE IS CLEAN — no logic errors detected.");
