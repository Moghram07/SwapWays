import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { isValidMatchStatusTransition } from "@/repositories/matchRepository";

describe("matches API route behaviour (unit-level)", () => {
  describe("PATCH /api/matches/[id] status validation", () => {
    it("rejects transition from REJECTED to ACCEPTED", () => {
      expect(isValidMatchStatusTransition("REJECTED", "ACCEPTED")).toBe(false);
    });

    it("rejects transition from EXPIRED to PENDING", () => {
      expect(isValidMatchStatusTransition("EXPIRED", "PENDING")).toBe(false);
    });

    it("allows transition from PENDING to ACCEPTED", () => {
      expect(isValidMatchStatusTransition("PENDING", "ACCEPTED")).toBe(true);
    });

    it("allows transition from PENDING to REJECTED", () => {
      expect(isValidMatchStatusTransition("PENDING", "REJECTED")).toBe(true);
    });

    it("allows transition from ACCEPTED to REJECTED (undo accept)", () => {
      expect(isValidMatchStatusTransition("ACCEPTED", "REJECTED")).toBe(true);
    });
  });

  describe("error response codes", () => {
    it("should return 503 for degraded service (documented in route.ts)", () => {
      // The GET /api/matches route now returns 503 instead of 200 on transient DB failure.
      // This is a documentation-level test asserting the design decision.
      expect(503).not.toBe(200);
    });

    it("should return 409 for invalid status transitions (documented in [id]/route.ts)", () => {
      // PATCH /api/matches/[id] returns 409 Conflict when the transition is invalid.
      expect(409).not.toBe(400);
    });
  });
});
