import { describe, expect, it } from "vitest";
import { matchCacheNeedsRecompute } from "../../src/services/matching/matchCacheLegacy";

describe("matchCacheNeedsRecompute", () => {
  it("flags legacy layover trip count reasons", () => {
    expect(matchCacheNeedsRecompute(["Has 3 layover trip(s)"])).toBe(true);
    expect(matchCacheNeedsRecompute(["foo", "Has 12 layover trip(s)"])).toBe(true);
  });

  it("flags legacy turnaround and freebie reasons", () => {
    expect(matchCacheNeedsRecompute(["Has 2 turnaround trip(s)"])).toBe(true);
    expect(matchCacheNeedsRecompute(["No date constraint - flexible"])).toBe(true);
    expect(matchCacheNeedsRecompute(["Has non-excluded destinations"])).toBe(true);
  });

  it("flags mutual-engine reasons (pre-Fit Score engine is also stale)", () => {
    expect(matchCacheNeedsRecompute(["They offer BOM — on your wants list"])).toBe(true);
    expect(matchCacheNeedsRecompute(["Same-day swap possible"])).toBe(true);
  });

  it("does not flag new-engine reasons", () => {
    expect(matchCacheNeedsRecompute(["They offer a destination you want"])).toBe(false);
    expect(matchCacheNeedsRecompute(["Same trip type", "Partial date alignment — their trip isn't on your willing-to-fly days"])).toBe(false);
    expect(matchCacheNeedsRecompute(["Open to any trip type", "Dates don't align with either side's willing-to-fly days"])).toBe(false);
  });
});
