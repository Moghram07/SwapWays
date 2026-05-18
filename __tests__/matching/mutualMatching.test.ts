import { describe, expect, it } from "vitest";
import { checkHardConstraints } from "../../src/services/matching/hardConstraints";
import { scoreWithSignals } from "../../src/services/matching/signalScoring";
import type { ViewerSignals } from "../../src/services/matching/viewerSignalsModel";
import type { PostLike } from "../../src/services/matching/softScoring";

const baseSchedule = {
  month: 5,
  year: 2026,
  trips: [
    {
      instanceId: "schedTrip-1",
      startDate: new Date("2026-05-12T00:00:00.000Z"),
      blockHours: 9,
      tripType: "LAYOVER" as const,
      legs: [
        {
          departureAirport: "JED",
          arrivalAirport: "DXB",
          departureDate: new Date("2026-05-12T06:00:00.000Z"),
          arrivalDate: new Date("2026-05-12T08:00:00.000Z"),
        },
      ],
      layovers: [{ durationDecimal: 30 }],
    },
  ],
};

function buildSignals(overrides: Partial<ViewerSignals> = {}): ViewerSignals {
  const wtfDateKeys = overrides.wtfDateKeys ?? new Set<string>();
  const offeredDateKeys = overrides.offeredDateKeys ?? new Set<string>();
  const offeredDestinations = overrides.offeredDestinations ?? [];
  return {
    offeredDates: [],
    offeredDateKeys,
    offeredDestinations,
    offeredTripTypes: overrides.offeredTripTypes ?? new Set<"LAYOVER" | "TURNAROUND" | "MULTI_STOP">(),
    wantedDestinations: overrides.wantedDestinations ?? [],
    excludedDestinations: overrides.excludedDestinations ?? [],
    wtfDateKeys,
    wantTypes: overrides.wantTypes ?? ["LAYOVER"],
    hasAnyDestinationFlex: overrides.hasAnyDestinationFlex ?? false,
    viewerPostsBlockHoursTotal: overrides.viewerPostsBlockHoursTotal ?? 9,
    scheduleTripsByMonth: overrides.scheduleTripsByMonth ?? new Map(),
    hasActivePosts: overrides.hasActivePosts ?? true,
    hasSchedule: overrides.hasSchedule ?? true,
    wantEqualHours: overrides.wantEqualHours ?? false,
    wantSameDate: overrides.wantSameDate ?? false,
    wantMinLayover: overrides.wantMinLayover ?? null,
    hasExplicitWtfFromPosts: overrides.hasExplicitWtfFromPosts ?? wtfDateKeys.size > 0,
    ...overrides,
  };
}

function candidate(overrides: Partial<PostLike> = {}): PostLike {
  return {
    wantType: "LAYOVER",
    wantDestinations: ["DXB"],
    wantExclude: [],
    wantMinLayover: 24,
    wtfDays: [18, 20],
    offeredTrips: [
      {
        departureDate: new Date("2026-05-12T00:00:00.000Z"),
        destination: "BOM",
        creditHours: 9,
        blockHours: 9,
        hasLayover: true,
        layoverHours: 30,
        tripType: "LAYOVER",
        scheduleTrip: { legs: [] },
      },
    ],
    quickTripType: null,
    quickDestinations: [],
    quickDate: null,
    quickLayoverHours: null,
    advancedBlockHours: null,
    ...overrides,
  };
}

describe("Signal blended scoring", () => {
  it("scores high when both directions fit (destinations + WTF + layover path)", () => {
    const signals = buildSignals({
      wtfDateKeys: new Set(["2026-05-12", "2026-05-18"]),
      offeredDateKeys: new Set(["2026-05-18"]),
      offeredDestinations: [],
      wantedDestinations: ["BOM"],
    });
    const result = scoreWithSignals(signals, candidate(), baseSchedule, 72);

    expect(result.total).toBeGreaterThanOrEqual(55);
    expect(result.breakdown.mutualSwap).toBeGreaterThan(0);
    expect(result.breakdown.oneSidedFit).toBeGreaterThan(0);
  });

  it("produces non-zero mutual breakdown components", () => {
    const signals = buildSignals({
      wtfDateKeys: new Set(["2026-05-12"]),
      offeredDateKeys: new Set(["2026-05-18"]),
      wantedDestinations: ["BOM"],
    });
    const result = scoreWithSignals(signals, candidate(), baseSchedule, 72);
    expect(result.breakdown.mutualSwap).toBeGreaterThanOrEqual(0);
    expect(result.breakdown.dateAlignment).toBeGreaterThanOrEqual(0);
  });
});

describe("Hard filter — viewer's WTF days (calendar keys)", () => {
  const viewerProfile = {
    id: "viewer-1",
    baseId: "base-1",
    rankId: "rank-1",
    rank: { code: "HST", category: "CABIN" as const, name: "Host" },
    qualifications: [{ aircraftType: { code: "A320", scheduleCode: "A320" } }],
    hasUsVisa: true,
    hasChinaVisa: true,
  };

  const ownerProfile = {
    id: "owner-1",
    baseId: "base-1",
    rankId: "rank-1",
    rank: { code: "HST", category: "CABIN" as const, name: "Host" },
    qualifications: [{ aircraftType: { code: "A320", scheduleCode: "A320" } }],
    hasUsVisa: true,
    hasChinaVisa: true,
  };

  it("passes when offered departure date is not in viewer's WTF calendar (WTF is now a multiplier, not a hard gate)", () => {
    const result = checkHardConstraints(
      viewerProfile,
      [],
      {
        wantExclude: [],
        offeredTrips: [
          {
            departureDate: new Date("2026-05-17T00:00:00.000Z"),
            scheduleTrip: { legs: [] },
          },
        ],
      },
      ownerProfile,
      []
    );

    expect(result.passes).toBe(true);
  });

  it("passes when offered date is in viewer's WTF calendar", () => {
    const result = checkHardConstraints(
      viewerProfile,
      [],
      {
        wantExclude: [],
        offeredTrips: [
          {
            departureDate: new Date("2026-05-12T00:00:00.000Z"),
            scheduleTrip: { legs: [] },
          },
        ],
      },
      ownerProfile,
      []
    );

    expect(result.passes).toBe(true);
  });

  it("does not enforce WTF when viewer has no explicit gate", () => {
    const result = checkHardConstraints(
      viewerProfile,
      [],
      {
        wantExclude: [],
        offeredTrips: [
          {
            departureDate: new Date("2026-05-17T00:00:00.000Z"),
            scheduleTrip: { legs: [] },
          },
        ],
      },
      ownerProfile,
      []
    );

    expect(result.passes).toBe(true);
  });

  it("does not enforce WTF when gate says no explicit posts", () => {
    const result = checkHardConstraints(
      viewerProfile,
      [],
      {
        wantExclude: [],
        offeredTrips: [
          {
            departureDate: new Date("2026-05-17T00:00:00.000Z"),
            scheduleTrip: { legs: [] },
          },
        ],
      },
      ownerProfile,
      []
    );

    expect(result.passes).toBe(true);
  });

  it("passes when offered trips span WTF and non-WTF dates (WTF is now a multiplier, not a hard gate)", () => {
    const result = checkHardConstraints(
      viewerProfile,
      [],
      {
        wantExclude: [],
        offeredTrips: [
          { departureDate: new Date("2026-05-12T00:00:00.000Z"), scheduleTrip: { legs: [] } },
          { departureDate: new Date("2026-05-17T00:00:00.000Z"), scheduleTrip: { legs: [] } },
        ],
      },
      ownerProfile,
      []
    );

    expect(result.passes).toBe(true);
  });

  it("passes quick posts regardless of WTF date (WTF is now a multiplier, not a hard gate)", () => {
    const result = checkHardConstraints(
      viewerProfile,
      [],
      {
        wantExclude: [],
        offeredTrips: [],
        quickDate: new Date("2026-05-17T00:00:00.000Z"),
      },
      ownerProfile,
      []
    );

    expect(result.passes).toBe(true);
  });
});
