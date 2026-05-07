import { describe, it, expect, vi } from "vitest";

vi.mock("@/repositories/tradeRepository", () => ({
  findTradeById: vi.fn(),
  findCandidateTradesForMatching: vi.fn(),
}));

vi.mock("@/repositories/matchRepository", () => ({
  createMatch: vi.fn(),
  createOrRefreshPendingMatch: vi.fn(),
}));

vi.mock("@/repositories/scheduleRepository", () => ({}));
vi.mock("@/repositories/swapPostRepository", () => ({}));
vi.mock("@/repositories/userRepository", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/services/matching/matchValidator", () => ({
  filterByHardConstraints: vi.fn(() => []),
}));

vi.mock("@/services/matching/matchScorer", () => ({
  scoreSingleMatch: vi.fn(() => 75),
}));

vi.mock("@/services/matching/hardConstraints", () => ({
  checkHardConstraints: vi.fn(),
}));

vi.mock("@/services/matching/softScoring", () => ({
  calculateMatchScore: vi.fn(),
}));

import { findMatchesForTrade } from "@/services/matching/matchEngine";
import * as tradeRepo from "@/repositories/tradeRepository";

describe("findMatchesForTrade", () => {
  it("returns empty array when trade not found", async () => {
    vi.mocked(tradeRepo.findTradeById).mockResolvedValue(null as never);
    const result = await findMatchesForTrade("nonexistent");
    expect(result).toEqual([]);
  });

  it("returns empty array when trade is not OPEN", async () => {
    vi.mocked(tradeRepo.findTradeById).mockResolvedValue({
      id: "t1",
      status: "CLOSED",
      destination: "JFK",
      departureDate: new Date(),
      userId: "u1",
      user: { airlineId: "a1", baseId: "b1" },
    } as never);
    const result = await findMatchesForTrade("t1");
    expect(result).toEqual([]);
  });

  it("returns empty array when trade has no destination", async () => {
    vi.mocked(tradeRepo.findTradeById).mockResolvedValue({
      id: "t1",
      status: "OPEN",
      destination: null,
      departureDate: new Date(),
      userId: "u1",
      user: { airlineId: "a1", baseId: "b1" },
    } as never);
    const result = await findMatchesForTrade("t1");
    expect(result).toEqual([]);
  });
});
