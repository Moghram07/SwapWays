import { describe, expect, it } from "vitest";
import { calculateMutualMatchScore } from "../../src/services/matching/softScoring";
import { checkHardConstraints } from "../../src/services/matching/hardConstraints";
import type { ViewerActivePostLike } from "../../src/services/matching/softScoring";

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

function buildViewerPost(overrides: Partial<ViewerActivePostLike> = {}): ViewerActivePostLike {
  return {
    wantType: "LAYOVER",
    wantDestinations: ["BOM"],
    wantExclude: [],
    wantMinLayover: 24,
    wantEqualHours: false,
    wantSameDate: false,
    wtfDays: [12, 18],
    offeredTrips: [
      {
        departureDate: new Date("2026-05-18T00:00:00.000Z"),
        destination: "DXB",
        destinations: ["DXB"],
        tripType: "LAYOVER",
        creditHours: 9,
        blockHours: 9,
        hasLayover: true,
        layoverHours: 30,
      },
    ],
    quickTripType: null,
    quickDestinations: [],
    quickDate: null,
    quickLayoverHours: null,
    ...overrides,
  };
}

function buildCandidatePost(overrides: Partial<Parameters<typeof calculateMutualMatchScore>[1]> = {}): Parameters<typeof calculateMutualMatchScore>[1] {
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

describe("Mutual matching engine", () => {
  it("scores high when both directions fit (mutual destinations + WTF dates + layover)", () => {
    const result = calculateMutualMatchScore(
      buildViewerPost(),
      buildCandidatePost(),
      baseSchedule
    );

    expect(result.total).toBeGreaterThanOrEqual(70);
    expect(result.reasons.some((r) => r.includes("BOM"))).toBe(true);
    expect(result.reasons.some((r) => r.includes("layover trip"))).toBe(true);
    expect(result.reasons.some((r) => r.includes("Layover 30h"))).toBe(true);
  });

  it("does not emit 'Has N layover trips' style schedule reasons", () => {
    const result = calculateMutualMatchScore(
      buildViewerPost(),
      buildCandidatePost(),
      baseSchedule
    );

    expect(result.reasons.some((r) => /^Has \d+ layover trip/.test(r))).toBe(false);
    expect(result.reasons.some((r) => r.includes("No date constraint"))).toBe(false);
  });

  it("scores low when their destinations don't match what you want", () => {
    const result = calculateMutualMatchScore(
      buildViewerPost({ wantDestinations: ["LON", "PAR"] }),
      buildCandidatePost(),
      baseSchedule
    );

    expect(result.total).toBeLessThan(50);
  });

  it("penalizes when their offered date is not on your willing-to-fly days", () => {
    const result = calculateMutualMatchScore(
      buildViewerPost({ wtfDays: [3, 4, 5] }),
      buildCandidatePost(),
      baseSchedule
    );

    // Direction A is capped (no departure on your WTF); blended score stays well below a strong mutual fit.
    expect(result.total).toBeLessThan(70);
  });

  it("rewards equal block hours when wantEqualHours is true and totals match", () => {
    const equal = calculateMutualMatchScore(
      buildViewerPost({ wantEqualHours: true }),
      buildCandidatePost(),
      baseSchedule
    );
    const unequal = calculateMutualMatchScore(
      buildViewerPost({
        wantEqualHours: true,
        offeredTrips: [
          {
            departureDate: new Date("2026-05-18T00:00:00.000Z"),
            destination: "DXB",
            destinations: ["DXB"],
            tripType: "LAYOVER",
            creditHours: 4,
            blockHours: 4,
            hasLayover: true,
            layoverHours: 30,
          },
        ],
      }),
      buildCandidatePost(),
      baseSchedule
    );

    expect(equal.total).toBeGreaterThan(unequal.total);
  });

  it("counts a destination as wanted only when it is in wantDestinations", () => {
    const result = calculateMutualMatchScore(
      buildViewerPost(),
      buildCandidatePost({
        offeredTrips: [
          {
            departureDate: new Date("2026-05-12T00:00:00.000Z"),
            destination: "ZZZ",
            creditHours: 9,
            hasLayover: true,
            layoverHours: 30,
            tripType: "LAYOVER",
            scheduleTrip: { legs: [] },
          },
        ],
      }),
      baseSchedule
    );

    expect(result.reasons.some((r) => r.includes("BOM"))).toBe(false);
    expect(
      result.reasons.some((r) => r.toLowerCase().includes("they offer") && r.toLowerCase().includes("wants list"))
    ).toBe(false);
  });

  it("still produces a reason when their layover is below your minimum", () => {
    const result = calculateMutualMatchScore(
      buildViewerPost({ wantMinLayover: 48 }),
      buildCandidatePost({
        offeredTrips: [
          {
            departureDate: new Date("2026-05-12T00:00:00.000Z"),
            destination: "BOM",
            creditHours: 9,
            hasLayover: true,
            layoverHours: 24, // below 48
            tripType: "LAYOVER",
            scheduleTrip: { legs: [] },
          },
        ],
      }),
      baseSchedule
    );

    expect(result.reasons.some((r) => r.includes("below your"))).toBe(true);
  });
});

describe("Hard filter — viewer's WTF days", () => {
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

  it("rejects when offered departure date is not in viewer's wtfDays", () => {
    const result = checkHardConstraints(
      viewerProfile,
      [], // schedule trips
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
      [],
      { wtfDays: [12, 18, 20], offeredTrips: [] }
    );

    expect(result.passes).toBe(false);
    expect(result.failReason).toBe("Trip date not in your willing-to-fly days");
  });

  it("passes when offered date is in viewer's wtfDays", () => {
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
      [],
      { wtfDays: [12, 18, 20], offeredTrips: [] }
    );

    expect(result.passes).toBe(true);
  });

  it("does not enforce WTF when viewer has no active post", () => {
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
      [],
      null
    );

    expect(result.passes).toBe(true);
  });

  it("does not enforce WTF when viewer's wtfDays is empty", () => {
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
      [],
      { wtfDays: [], offeredTrips: [] }
    );

    expect(result.passes).toBe(true);
  });

  it("rejects when ANY of multiple offered trips falls outside wtfDays (package deal)", () => {
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
      [],
      { wtfDays: [12, 18, 20], offeredTrips: [] }
    );

    expect(result.passes).toBe(false);
  });

  it("uses quickDate when offered trips list is empty", () => {
    const result = checkHardConstraints(
      viewerProfile,
      [],
      {
        wantExclude: [],
        offeredTrips: [],
        quickDate: new Date("2026-05-17T00:00:00.000Z"),
      },
      ownerProfile,
      [],
      { wtfDays: [12, 18, 20], offeredTrips: [] }
    );

    expect(result.passes).toBe(false);
  });
});
