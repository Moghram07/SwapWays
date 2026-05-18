import { describe, expect, it } from "vitest";
import { calculateMatchScore } from "../../src/services/matching/softScoring";
import { checkHardConstraints } from "../../src/services/matching/hardConstraints";

function buildViewer(
  qualificationCodes: string[],
  overrides?: Partial<{
    id: string;
    baseId: string;
    rankId: string;
    rankCode: string;
    category: "CABIN" | "FLIGHT_DECK";
    hasUsVisa: boolean;
    hasChinaVisa: boolean;
  }>
) {
  return {
    id: overrides?.id ?? "viewer-1",
    baseId: overrides?.baseId ?? "base-1",
    rankId: overrides?.rankId ?? "rank-1",
    rank: {
      code: overrides?.rankCode ?? "HST",
      category: overrides?.category ?? "CABIN",
      name: "Host",
    },
    qualifications: qualificationCodes.map((code) => ({
      aircraftType: { code, scheduleCode: code },
    })),
    hasUsVisa: overrides?.hasUsVisa ?? true,
    hasChinaVisa: overrides?.hasChinaVisa ?? true,
  };
}

describe("swap post matching updates", () => {
  it("gives strong WTF overlap score for DAYS_OFF preference", () => {
    const result = calculateMatchScore(
      {
        month: 3,
        year: 2026,
        trips: [
          {
            instanceId: "viewer-trip-1",
            startDate: new Date("2026-03-10T00:00:00.000Z"),
            blockHours: 8,
            tripType: "LAYOVER",
            legs: [
              {
                departureAirport: "JED",
                arrivalAirport: "RUH",
                departureDate: new Date("2026-03-10T06:00:00.000Z"),
                arrivalDate: new Date("2026-03-10T08:00:00.000Z"),
              },
            ],
            layovers: [],
          },
        ],
      },
      72,
      {
        wantType: "DAYS_OFF",
        wantDestinations: [],
        wantExclude: [],
        wantMinLayover: null,
        offeredTrips: [
          {
            departureDate: new Date("2026-03-20T00:00:00.000Z"),
            destination: "DXB",
            creditHours: 8,
            hasLayover: false,
            layoverHours: null,
            tripType: "TURNAROUND",
            scheduleTrip: { legs: [] },
          },
        ],
        wtfDays: [10, 11, 12],
      }
    );

    expect(result.breakdown.wtfDayOverlap).toBeGreaterThanOrEqual(20);
  });

  it("does not hard-penalize same-date mismatch when DAYS_OFF flexibility exists", () => {
    const result = calculateMatchScore(
      {
        month: 3,
        year: 2026,
        trips: [
          {
            instanceId: "viewer-trip-1",
            startDate: new Date("2026-03-01T00:00:00.000Z"),
            blockHours: 8,
            tripType: "LAYOVER",
            legs: [
              {
                departureAirport: "JED",
                arrivalAirport: "RUH",
                departureDate: new Date("2026-03-01T06:00:00.000Z"),
                arrivalDate: new Date("2026-03-01T08:00:00.000Z"),
              },
            ],
            layovers: [],
          },
        ],
      },
      72,
      {
        wantType: "DAYS_OFF",
        wantDestinations: [],
        wantExclude: [],
        wantMinLayover: null,
        offeredTrips: [
          {
            departureDate: new Date("2026-03-20T00:00:00.000Z"),
            destination: "DXB",
            creditHours: 8,
            hasLayover: false,
            layoverHours: null,
            tripType: "TURNAROUND",
            scheduleTrip: { legs: [] },
          },
        ],
        wtfDays: [10],
      }
    );

    expect(result.breakdown.sameDateBonus).toBe(4);
  });

  it("passes hard constraints when viewer is qualified for post aircraft (reverse qual check removed)", () => {
    const viewer = buildViewer(["A320"], { id: "viewer", rankId: "rank", rankCode: "HST" });
    const postOwner = buildViewer(["B777"], { id: "owner", rankId: "rank", rankCode: "HST" });

    const result = checkHardConstraints(
      viewer,
      [
        {
          legs: [
            {
              departureDate: new Date("2026-03-10T00:00:00.000Z"),
              arrivalDate: new Date("2026-03-10T02:00:00.000Z"),
              departureAirport: "JED",
              arrivalAirport: "RUH",
              flightNumber: "1234",
              aircraftTypeCode: "A320",
            },
          ],
        },
      ],
      {
        wantExclude: [],
        offeredTrips: [
          {
            scheduleTrip: {
              legs: [
                {
                  departureDate: new Date("2026-03-12T00:00:00.000Z"),
                  arrivalDate: new Date("2026-03-12T02:00:00.000Z"),
                  departureAirport: "JED",
                  arrivalAirport: "DXB",
                  aircraftTypeCode: "A320",
                  flightNumber: "5678",
                },
              ],
            },
          },
        ],
      },
      postOwner
    );

    expect(result.passes).toBe(true);
  });

  it("allows quick posts without aircraft details to pass aircraft hard constraints", () => {
    const viewer = buildViewer(["A320"], { id: "viewer", rankId: "rank", rankCode: "HST" });
    const postOwner = buildViewer(["B777"], { id: "owner", rankId: "rank", rankCode: "HST" });

    const result = checkHardConstraints(
      viewer,
      [
        {
          legs: [
            {
              departureDate: new Date("2026-03-10T00:00:00.000Z"),
              arrivalDate: new Date("2026-03-10T02:00:00.000Z"),
              departureAirport: "JED",
              arrivalAirport: "RUH",
              flightNumber: "1234",
              aircraftTypeCode: "A320",
            },
          ],
        },
      ],
      {
        wantExclude: [],
        advancedAircraftTypeCode: null,
        offeredTrips: [],
      },
      postOwner
    );

    expect(result.passes).toBe(true);
  });

  it("scores quick posts with missing block-hours without heavy penalty", () => {
    const result = calculateMatchScore(
      {
        month: 3,
        year: 2026,
        trips: [
          {
            instanceId: "viewer-trip-1",
            startDate: new Date("2026-03-10T00:00:00.000Z"),
            blockHours: 8,
            tripType: "LAYOVER",
            legs: [
              {
                departureAirport: "JED",
                arrivalAirport: "BOM",
                departureDate: new Date("2026-03-10T06:00:00.000Z"),
                arrivalDate: new Date("2026-03-10T08:00:00.000Z"),
              },
            ],
            layovers: [{ durationDecimal: 28 }],
          },
        ],
      },
      72,
      {
        wantType: "LAYOVER",
        wantDestinations: [],
        wantExclude: [],
        wantMinLayover: null,
        offeredTrips: [],
        wtfDays: [],
        quickTripType: "LAYOVER",
        quickDestinations: ["BOM"],
        quickDate: new Date("2026-03-12T00:00:00.000Z"),
        quickLayoverHours: 24,
      }
    );

    expect(result.breakdown.blockHoursBalance).toBeGreaterThanOrEqual(4);
    expect(result.total).toBeGreaterThan(20);
  });
});
