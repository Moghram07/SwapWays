/**
 * Unit tests for mapTripsForChat.
 * Run with: npx vitest run __tests__/chat/tripMapping.test.ts
 *
 * Trip resolution/normalization now happens server-side (the conversation GET produces
 * `ownerTripView` / `initiatorTripView` from either a ScheduleTrip or a manual SwapPostTrip).
 * mapTripsForChat's only job is to swap those views into "my"/"their" based on the viewer.
 */

import { describe, it, expect } from "vitest";
import { mapTripsForChat, type ChatTripView } from "../../src/utils/chatTripMapping";

const ownerTrip = { startDate: "2026-07-01", reportTime: "02.45", legs: [], layovers: [] } as ChatTripView;
const offeredTrip = { startDate: "2026-07-02", reportTime: "06.00", legs: [], layovers: [] } as ChatTripView;

describe("mapTripsForChat", () => {
  it("when current user is trade owner: myTrip is owner trip, theirTrip is initiator offered trip", () => {
    const conversation = {
      initiatorId: "initiator-id",
      tradeOwnerId: "owner-id",
      postOwnerId: null,
      ownerTripView: ownerTrip,
      initiatorTripView: offeredTrip,
      currentOfferId: "offered-schedule-id",
    };
    const result = mapTripsForChat("owner-id", conversation);
    expect(result.myTrip).toBe(ownerTrip);
    expect(result.theirTrip).toBe(offeredTrip);
    expect(result.currentOfferId).toBeNull();
  });

  it("when current user is post owner (swap post): myTrip is post trip, theirTrip is initiator offered trip", () => {
    const conversation = {
      initiatorId: "initiator-id",
      tradeOwnerId: null,
      postOwnerId: "owner-id",
      ownerTripView: ownerTrip,
      initiatorTripView: offeredTrip,
      currentOfferId: "offered-schedule-id",
    };
    const result = mapTripsForChat("owner-id", conversation);
    expect(result.myTrip).toBe(ownerTrip);
    expect(result.theirTrip).toBe(offeredTrip);
    expect(result.currentOfferId).toBeNull();
  });

  it("when current user is initiator: myTrip is offered trip, theirTrip is owner trip", () => {
    const conversation = {
      initiatorId: "initiator-id",
      tradeOwnerId: "owner-id",
      postOwnerId: null,
      ownerTripView: ownerTrip,
      initiatorTripView: offeredTrip,
      currentOfferId: "offered-schedule-id",
    };
    const result = mapTripsForChat("initiator-id", conversation);
    expect(result.myTrip).toBe(offeredTrip);
    expect(result.theirTrip).toBe(ownerTrip);
    expect(result.currentOfferId).toBe("offered-schedule-id");
  });

  it("symmetry: switching currentUserId flips myTrip and theirTrip", () => {
    const conversation = {
      initiatorId: "initiator-id",
      tradeOwnerId: "owner-id",
      postOwnerId: null,
      ownerTripView: ownerTrip,
      initiatorTripView: offeredTrip,
      currentOfferId: "offered-schedule-id",
    };
    const asOwner = mapTripsForChat("owner-id", conversation);
    const asInitiator = mapTripsForChat("initiator-id", conversation);
    expect(asOwner.myTrip).toBe(asInitiator.theirTrip);
    expect(asOwner.theirTrip).toBe(asInitiator.myTrip);
  });

  it("carries a swapPostTripId offer id for the initiator (manual trip)", () => {
    const conversation = {
      initiatorId: "initiator-id",
      tradeOwnerId: null,
      postOwnerId: "owner-id",
      ownerTripView: ownerTrip,
      initiatorTripView: offeredTrip,
      currentOfferId: "swap-post-trip-id",
    };
    const result = mapTripsForChat("initiator-id", conversation);
    expect(result.myTrip).toBe(offeredTrip);
    expect(result.theirTrip).toBe(ownerTrip);
    expect(result.currentOfferId).toBe("swap-post-trip-id");
  });

  it("returns null myTrip for unknown current user", () => {
    const conversation = {
      initiatorId: "initiator-id",
      tradeOwnerId: "owner-id",
      postOwnerId: null,
      ownerTripView: ownerTrip,
      initiatorTripView: offeredTrip,
      currentOfferId: "offered-schedule-id",
    };
    const result = mapTripsForChat("other-user-id", conversation);
    expect(result.myTrip).toBeNull();
    expect(result.theirTrip).toBe(ownerTrip);
  });
});
