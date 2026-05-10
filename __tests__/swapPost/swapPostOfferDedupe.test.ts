import { describe, expect, it } from "vitest";
import {
  hasDuplicateAmongFingerprints,
  offeredTripFingerprintFromCandidate,
  offeredTripFingerprintFromStored,
} from "@/lib/swapPostOfferDedupe";
import {
  formatMultiStopAirportChain,
  formatMultiStopRouteFromLegs,
  multiStopRouteSegmentsFromCodes,
} from "@/utils/multiStopRouteDisplay";

describe("swapPostOfferDedupe", () => {
  it("uses sched id when scheduleTripId is set", () => {
    expect(
      offeredTripFingerprintFromCandidate({
        scheduleTripId: "abc-123",
        departureDate: new Date("2026-01-01T00:00:00.000Z"),
        tripType: "LAYOVER",
        reportTime: "04:00",
        destinations: ["X"],
        destination: "X",
        flightNumber: null,
        layoverHours: 12,
      })
    ).toBe("sched:abc-123");
  });

  it("normalizes manual multi-stop report time and DH flight prefix", () => {
    const a = offeredTripFingerprintFromCandidate({
      scheduleTripId: null,
      departureDate: new Date("2026-05-01T00:00:00.000Z"),
      tripType: "MULTI_STOP",
      reportTime: "04.00Z",
      destinations: ["jed", "giz"],
      destination: "JED",
      flightNumber: "DH123",
      layoverHours: null,
    });
    const b = offeredTripFingerprintFromCandidate({
      scheduleTripId: undefined,
      departureDate: new Date("2026-05-01T00:00:00.000Z"),
      tripType: "MULTI_STOP",
      reportTime: "04:00",
      destinations: ["JED", "GIZ"],
      destination: "JED",
      flightNumber: "123",
      layoverHours: null,
    });
    expect(a).toBe(b);
  });

  it("collapses consecutive duplicate airports in manual fingerprint", () => {
    const stutter = offeredTripFingerprintFromCandidate({
      scheduleTripId: null,
      departureDate: new Date("2026-05-08T00:00:00.000Z"),
      tripType: "MULTI_STOP",
      reportTime: "04:00",
      destinations: ["JED", "GIZ", "GIZ", "JED", "JED", "BHH", "BHH", "JED"],
      destination: "JED",
      flightNumber: null,
      layoverHours: null,
    });
    const clean = offeredTripFingerprintFromCandidate({
      scheduleTripId: null,
      departureDate: new Date("2026-05-08T00:00:00.000Z"),
      tripType: "MULTI_STOP",
      reportTime: "04:00",
      destinations: ["JED", "GIZ", "JED", "BHH", "JED"],
      destination: "JED",
      flightNumber: null,
      layoverHours: null,
    });
    expect(stutter).toBe(clean);
  });

  it("includes layover hours for LAYOVER manual trips", () => {
    const short = offeredTripFingerprintFromCandidate({
      scheduleTripId: null,
      departureDate: new Date("2026-05-01T00:00:00.000Z"),
      tripType: "LAYOVER",
      reportTime: "04:00",
      destinations: ["RUH"],
      destination: "RUH",
      flightNumber: null,
      layoverHours: 12,
    });
    const long = offeredTripFingerprintFromCandidate({
      scheduleTripId: null,
      departureDate: new Date("2026-05-01T00:00:00.000Z"),
      tripType: "LAYOVER",
      reportTime: "04:00",
      destinations: ["RUH"],
      destination: "RUH",
      flightNumber: null,
      layoverHours: 24,
    });
    expect(short).not.toBe(long);
  });

  it("hasDuplicateAmongFingerprints detects overlap", () => {
    expect(hasDuplicateAmongFingerprints(["a", "b"], new Set(["b"]))).toBe(true);
    expect(hasDuplicateAmongFingerprints(["a"], new Set(["b"]))).toBe(false);
  });

  it("stored row matches candidate shape", () => {
    const row = {
      scheduleTripId: null,
      departureDate: new Date("2026-03-15T00:00:00.000Z"),
      tripType: "TURNAROUND" as const,
      reportTime: "02:30",
      destinations: ["DMM"],
      destination: "DMM",
      flightNumber: "456",
      layoverHours: null,
    };
    expect(offeredTripFingerprintFromStored(row)).toBe(
      offeredTripFingerprintFromCandidate({ ...row, scheduleTripId: null })
    );
  });
});

describe("multiStopRouteDisplay", () => {
  it("formatMultiStopAirportChain joins consecutive pairs", () => {
    expect(formatMultiStopAirportChain(["JED", "GIZ", "JED"])).toBe("JED → GIZ + GIZ → JED");
  });

  it("formatMultiStopAirportChain collapses station stutter", () => {
    expect(formatMultiStopAirportChain(["JED", "GIZ", "GIZ", "JED", "JED", "BHH", "BHH", "JED"])).toBe(
      "JED → GIZ + GIZ → JED + JED → BHH + BHH → JED"
    );
  });

  it("multiStopRouteSegmentsFromCodes lists each leg", () => {
    expect(multiStopRouteSegmentsFromCodes(["JED", "GIZ", "JED", "BHH", "JED"])).toEqual([
      "JED → GIZ",
      "GIZ → JED",
      "JED → BHH",
      "BHH → JED",
    ]);
  });

  it("formatMultiStopRouteFromLegs builds segments in order", () => {
    expect(
      formatMultiStopRouteFromLegs([
        { departureAirport: "JED", arrivalAirport: "GIZ" },
        { departureAirport: "GIZ", arrivalAirport: "JED" },
      ])
    ).toBe("JED → GIZ + GIZ → JED");
  });
});
