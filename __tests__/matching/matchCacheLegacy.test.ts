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

  it("does not flag mutual-engine reasons", () => {
    expect(matchCacheNeedsRecompute(["They offer BOM — on your wants list"])).toBe(false);
    expect(matchCacheNeedsRecompute(["Same-day swap possible"])).toBe(false);
  });
});
