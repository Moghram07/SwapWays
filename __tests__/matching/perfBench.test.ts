import { describe, expect, it } from "vitest";
import { scoreWithSignals } from "../../src/services/matching/signalScoring";
import type { ViewerSignals } from "../../src/services/matching/viewerSignalsModel";
import type { PostLike, ViewerScheduleLike, ViewerTripLike } from "../../src/services/matching/softScoring";

function makeTrip(i: number): ViewerTripLike {
  const day = 1 + (i % 28);
  const dk = `2026-05-${String(day).padStart(2, "0")}`;
  return {
    instanceId: `sched-${i}`,
    startDate: new Date(`${dk}T06:00:00.000Z`),
    blockHours: 8 + (i % 5),
    tripType: "LAYOVER",
    legs: [
      {
        departureAirport: "JED",
        arrivalAirport: "DXB",
        departureDate: new Date(`${dk}T06:00:00.000Z`),
        arrivalDate: new Date(`${dk}T10:00:00.000Z`),
      },
    ],
    layovers: [{ durationDecimal: 20 }],
  };
}

function makeCandidatePost(seed: number): PostLike {
  const d = 8 + (seed % 18);
  const dk = `2026-05-${String(d).padStart(2, "0")}`;
  return {
    wantType: "LAYOVER",
    wantDestinations: seed % 3 === 0 ? ["DXB"] : [],
    wantExclude: [],
    wantMinLayover: null,
    wtfDays: [d, d + 1],
    offeredTrips: [
      {
        departureDate: new Date(`${dk}T08:00:00.000Z`),
        destination: seed % 2 === 0 ? "KWI" : "LHE",
        creditHours: 9,
        blockHours: 9,
        hasLayover: true,
        layoverHours: 20,
        tripType: "LAYOVER",
        scheduleTrip: { legs: [] },
      },
    ],
  };
}

/** Viewer shaped like ~3 posts of signals + one month holding 8 schedule trips (no DB). */
function buildFixture() {
  const trips = Array.from({ length: 8 }, (_, i) => makeTrip(i));
  const schedule: ViewerScheduleLike = { month: 5, year: 2026, trips };
  const signals: ViewerSignals = {
    offeredDates: [
      new Date("2026-05-10T00:00:00.000Z"),
      new Date("2026-05-14T00:00:00.000Z"),
      new Date("2026-05-22T00:00:00.000Z"),
    ],
    offeredDateKeys: new Set(["2026-05-10", "2026-05-14", "2026-05-22"]),
    offeredDestinations: ["JED", "DXB", "CAI"],
    offeredTripTypes: new Set<"LAYOVER" | "TURNAROUND" | "MULTI_STOP">(["LAYOVER"]),
    wantedDestinations: ["KWI", "LHE"],
    excludedDestinations: [],
    wtfDateKeys: new Set(["2026-05-08", "2026-05-12", "2026-05-18", "2026-05-25"]),
    wantTypes: ["LAYOVER", "LAYOVER", "ANY_FLIGHT"],
    hasAnyDestinationFlex: true,
    viewerPostsBlockHoursTotal: 30,
    scheduleTripsByMonth: new Map([["2026-05", trips]]),
    hasActivePosts: true,
    hasSchedule: true,
    wantEqualHours: false,
    wantSameDate: false,
    wantMinLayover: 18,
    hasExplicitWtfFromPosts: true,
  };
  const candidates = Array.from({ length: 50 }, (_, i) => makeCandidatePost(i));
  return { signals, schedule, candidates };
}

describe("match scoring perf (engine hot path, no DB)", () => {
  it("averages under 2000ms per batch of 50 × scoreWithSignals over 10 runs", () => {
    const { signals, schedule, candidates } = buildFixture();
    const runs = 10;
    let totalMs = 0;
    for (let r = 0; r < runs; r++) {
      const t0 = performance.now();
      for (const post of candidates) {
        scoreWithSignals(signals, post, schedule, 72);
      }
      totalMs += performance.now() - t0;
    }
    const avg = totalMs / runs;
    console.log(`[perfBench] avg ${avg.toFixed(1)}ms per 50× scoreWithSignals (${runs} runs)`);
    expect(avg).toBeLessThan(2000);
  });
});
