import { describe, expect, it } from "vitest";
import { scoreWithSignals } from "../../src/services/matching/signalScoring";
import type { PostLike, ViewerScheduleLike } from "../../src/services/matching/softScoring";
import type { ViewerSignals } from "../../src/services/matching/viewerSignalsModel";
import { viewerHasComparableSignals } from "../../src/services/matching/viewerSignalsModel";

/** May 2026 schedule: single layover trip for one-sided scorer */
function maySchedule(trips: ViewerScheduleLike["trips"]): ViewerScheduleLike {
  return { month: 5, year: 2026, trips };
}

function assertBand(label: string, score: number, low: number, high: number) {
  console.log(`[Scenario ${label}] score=${score}`);
  expect(score, `${label} expected ${low}-${high}`).toBeGreaterThanOrEqual(low);
  expect(score, `${label} expected ${low}-${high}`).toBeLessThanOrEqual(high);
}

describe("Acceptance scenarios (v2 signal blend)", () => {
  it("A — date alignment both ways, weak destination (~40–50%)", () => {
    const schedule = maySchedule([
      {
        instanceId: "v1",
        startDate: new Date("2026-05-14T00:00:00.000Z"),
        blockHours: 10,
        tripType: "LAYOVER" as const,
        legs: [
          {
            departureAirport: "MXP",
            arrivalAirport: "JED",
            departureDate: new Date("2026-05-14T06:00:00.000Z"),
            arrivalDate: new Date("2026-05-14T10:00:00.000Z"),
          },
        ],
        layovers: [{ durationDecimal: 24 }],
      },
    ]);
    const signals: ViewerSignals = {
      offeredDates: [new Date("2026-05-14T00:00:00.000Z")],
      offeredDateKeys: new Set(["2026-05-14"]),
      offeredDestinations: ["MXP"],
      wantedDestinations: [],
      excludedDestinations: [],
      wtfDateKeys: new Set(
        ["2026-05-22", "2026-05-28", "2026-05-29"].map((k) => k)
      ),
      wantTypes: ["ANY_FLIGHT"],
      hasAnyDestinationFlex: true,
      viewerPostsBlockHoursTotal: 10,
      scheduleTripsByMonth: new Map([["2026-05", schedule.trips]]),
      hasActivePosts: true,
      hasSchedule: true,
      wantEqualHours: false,
      wantSameDate: false,
      wantMinLayover: null,
      hasExplicitWtfFromPosts: true,
    };

    const post: PostLike = {
      wantType: "ANY_FLIGHT",
      wantDestinations: [],
      wantExclude: [],
      wantMinLayover: null,
      wtfDays: [14, 18, 21],
      offeredTrips: [
        {
          departureDate: new Date("2026-05-24T00:00:00.000Z"),
          destination: "LHE",
          creditHours: 10,
          blockHours: 10,
          hasLayover: false,
          layoverHours: null,
          tripType: "LAYOVER",
          scheduleTrip: { legs: [] },
        },
      ],
    };

    const { total } = scoreWithSignals(signals, post, schedule, 80);
    assertBand("A", total, 40, 50);
  });

  it("B — mirror destination + dates (~65–75%)", () => {
    const schedule = maySchedule([
      {
        instanceId: "v1",
        startDate: new Date("2026-05-12T00:00:00.000Z"),
        blockHours: 9,
        tripType: "LAYOVER" as const,
        legs: [
          {
            departureAirport: "DXB",
            arrivalAirport: "KWI",
            departureDate: new Date("2026-05-12T06:00:00.000Z"),
            arrivalDate: new Date("2026-05-12T09:00:00.000Z"),
          },
        ],
        layovers: [{ durationDecimal: 20 }],
      },
    ]);
    const signals: ViewerSignals = {
      offeredDates: [new Date("2026-05-12T00:00:00.000Z")],
      offeredDateKeys: new Set(["2026-05-12"]),
      offeredDestinations: ["DXB", "KWI"],
      wantedDestinations: ["KWI"],
      excludedDestinations: [],
      wtfDateKeys: new Set(["2026-05-12", "2026-05-16", "2026-05-21"]),
      wantTypes: ["LAYOVER"],
      hasAnyDestinationFlex: false,
      viewerPostsBlockHoursTotal: 9,
      scheduleTripsByMonth: new Map([["2026-05", schedule.trips]]),
      hasActivePosts: true,
      hasSchedule: true,
      wantEqualHours: false,
      wantSameDate: false,
      wantMinLayover: null,
      hasExplicitWtfFromPosts: true,
    };

    const post: PostLike = {
      wantType: "ANYTHING",
      wantDestinations: [],
      wantExclude: [],
      wantMinLayover: null,
      wtfDays: [12, 15, 17],
      offeredTrips: [
        {
          departureDate: new Date("2026-05-13T00:00:00.000Z"),
          destination: "KWI",
          creditHours: 9,
          blockHours: 9,
          hasLayover: true,
          layoverHours: 20,
          tripType: "LAYOVER",
          scheduleTrip: { legs: [] },
        },
      ],
    };

    const { total } = scoreWithSignals(signals, post, schedule, 72);
    assertBand("B", total, 65, 75);
  });

  it("C — strong mutual: blocks + WTF + destinations (~75–85%)", () => {
    const schedule = maySchedule([
      {
        instanceId: "v1",
        startDate: new Date("2026-05-12T00:00:00.000Z"),
        blockHours: 10,
        tripType: "LAYOVER" as const,
        legs: [
          {
            departureAirport: "CAI",
            arrivalAirport: "DXB",
            departureDate: new Date("2026-05-12T06:00:00.000Z"),
            arrivalDate: new Date("2026-05-12T09:00:00.000Z"),
          },
        ],
        layovers: [{ durationDecimal: 18 }],
      },
    ]);
    const signals: ViewerSignals = {
      offeredDates: [new Date("2026-05-12T00:00:00.000Z")],
      offeredDateKeys: new Set(["2026-05-12"]),
      offeredDestinations: ["CAI", "DXB"],
      wantedDestinations: ["LHE"],
      excludedDestinations: [],
      wtfDateKeys: new Set(["2026-05-14", "2026-05-15"]),
      wantTypes: ["LAYOVER"],
      hasAnyDestinationFlex: false,
      viewerPostsBlockHoursTotal: 10,
      scheduleTripsByMonth: new Map([["2026-05", schedule.trips]]),
      hasActivePosts: true,
      hasSchedule: true,
      wantEqualHours: true,
      wantSameDate: false,
      wantMinLayover: 18,
      hasExplicitWtfFromPosts: true,
    };

    const post: PostLike = {
      wantType: "LAYOVER",
      wantDestinations: ["CAI", "DXB"],
      wantExclude: [],
      wantMinLayover: 18,
      wtfDays: [12],
      offeredTrips: [
        {
          departureDate: new Date("2026-05-14T00:00:00.000Z"),
          destination: "LHE",
          creditHours: 10,
          blockHours: 10,
          hasLayover: true,
          layoverHours: 18,
          tripType: "LAYOVER",
          scheduleTrip: { legs: [] },
        },
      ],
    };

    const { total } = scoreWithSignals(signals, post, schedule, 75);
    assertBand("C", total, 75, 85);
  });

  it("D — no signals: engine returns zero via matchEngine (documented)", () => {
    const empty: ViewerSignals = {
      offeredDates: [],
      offeredDateKeys: new Set(),
      offeredDestinations: [],
      wantedDestinations: [],
      excludedDestinations: [],
      wtfDateKeys: new Set(),
      wantTypes: [],
      hasAnyDestinationFlex: false,
      viewerPostsBlockHoursTotal: 0,
      scheduleTripsByMonth: new Map(),
      hasActivePosts: false,
      hasSchedule: false,
      wantEqualHours: false,
      wantSameDate: false,
      wantMinLayover: null,
      hasExplicitWtfFromPosts: false,
    };
    expect(viewerHasComparableSignals(empty)).toBe(false);
    console.log("[Scenario D] no comparable signals — board shows no % (handled in API)");
  });

  it("E — schedule-only: signals have trips in map, score > 0 against aligned post", () => {
    const trips = maySchedule([
      {
        instanceId: "s1",
        startDate: new Date("2026-05-10T00:00:00.000Z"),
        blockHours: 8,
        tripType: "LAYOVER" as const,
        legs: [
          {
            departureAirport: "JED",
            arrivalAirport: "DXB",
            departureDate: new Date("2026-05-10T06:00:00.000Z"),
            arrivalDate: new Date("2026-05-10T08:00:00.000Z"),
          },
        ],
        layovers: [{ durationDecimal: 22 }],
      },
    ]).trips;

    const signals: ViewerSignals = {
      offeredDates: [],
      offeredDateKeys: new Set(),
      offeredDestinations: [],
      wantedDestinations: [],
      excludedDestinations: [],
      wtfDateKeys: new Set(),
      wantTypes: [],
      hasAnyDestinationFlex: false,
      viewerPostsBlockHoursTotal: 0,
      scheduleTripsByMonth: new Map([["2026-05", trips]]),
      hasActivePosts: false,
      hasSchedule: true,
      wantEqualHours: false,
      wantSameDate: false,
      wantMinLayover: null,
      hasExplicitWtfFromPosts: false,
    };

    const primary: ViewerScheduleLike = { month: 5, year: 2026, trips };
    const post: PostLike = {
      wantType: "LAYOVER",
      wantDestinations: ["DXB"],
      wantExclude: [],
      wantMinLayover: null,
      wtfDays: [],
      offeredTrips: [
        {
          departureDate: new Date("2026-05-10T00:00:00.000Z"),
          destination: "DXB",
          creditHours: 8,
          blockHours: 8,
          hasLayover: true,
          layoverHours: 22,
          tripType: "LAYOVER",
          scheduleTrip: { legs: [] },
        },
      ],
    };

    const { total } = scoreWithSignals(signals, post, primary, 8);
    console.log(`[Scenario E] score=${total}`);
    expect(total).toBeGreaterThan(20);
  });
});
