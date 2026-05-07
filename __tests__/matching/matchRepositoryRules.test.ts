import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { isValidMatchStatusTransition } from "@/repositories/matchRepository";

describe("isValidMatchStatusTransition", () => {
  it("allows PENDING → ACCEPTED", () => {
    expect(isValidMatchStatusTransition("PENDING", "ACCEPTED")).toBe(true);
  });

  it("allows PENDING → REJECTED", () => {
    expect(isValidMatchStatusTransition("PENDING", "REJECTED")).toBe(true);
  });

  it("allows PENDING → EXPIRED", () => {
    expect(isValidMatchStatusTransition("PENDING", "EXPIRED")).toBe(true);
  });

  it("allows ACCEPTED → REJECTED", () => {
    expect(isValidMatchStatusTransition("ACCEPTED", "REJECTED")).toBe(true);
  });

  it("blocks REJECTED → ACCEPTED", () => {
    expect(isValidMatchStatusTransition("REJECTED", "ACCEPTED")).toBe(false);
  });

  it("blocks REJECTED → PENDING", () => {
    expect(isValidMatchStatusTransition("REJECTED", "PENDING")).toBe(false);
  });

  it("blocks EXPIRED → ACCEPTED", () => {
    expect(isValidMatchStatusTransition("EXPIRED", "ACCEPTED")).toBe(false);
  });

  it("blocks EXPIRED → PENDING", () => {
    expect(isValidMatchStatusTransition("EXPIRED", "PENDING")).toBe(false);
  });

  it("blocks ACCEPTED → PENDING (no rollback)", () => {
    expect(isValidMatchStatusTransition("ACCEPTED", "PENDING")).toBe(false);
  });

  it("returns false for unknown source status", () => {
    expect(isValidMatchStatusTransition("UNKNOWN", "ACCEPTED")).toBe(false);
  });
});
