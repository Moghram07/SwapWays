/**
 * Unit tests for mapTripsForChat.
 * Run with: npx vitest run __tests__/chat/tripMapping.test.ts
 */

import { describe, it, expect } from "vitest";
import { mapTripsForChat } from "../../src/utils/chatTripMapping";

const ownerTrip = { id: "owner-trip", tripNumber: "001" };
const offeredTrip = { id: "offered-trip", tripNumber: "002" };

describe("mapTripsForChat", () => {
  it("when current user is trade owner: myTrip is owner trip, theirTrip is initiator offered trip", () => {
    const conversation = {
      initiatorId: "initiator-id",
      tradeOwnerId: "owner-id",
      postOwnerId: null,
      offeredTripId: "offered-schedule-id",
      trade: { scheduleTrip: ownerTrip },
      swapPost: null,
      offeredTrip: offeredTrip,
      offeredTrips: null,
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
      offeredTripId: "offered-schedule-id",
      trade: null,
      swapPost: {
        offeredTrips: [{ scheduleTrip: ownerTrip }],
      },
      offeredTrip: offeredTrip,
      offeredTrips: null,
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
      offeredTripId: "offered-schedule-id",
      trade: { scheduleTrip: ownerTrip },
      swapPost: null,
      offeredTrip: offeredTrip,
      offeredTrips: null,
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
      offeredTripId: "offered-schedule-id",
      trade: { scheduleTrip: ownerTrip },
      swapPost: null,
      offeredTrip: offeredTrip,
      offeredTrips: null,
    };
    const asOwner = mapTripsForChat("owner-id", conversation);
    const asInitiator = mapTripsForChat("initiator-id", conversation);
    expect(asOwner.myTrip).toBe(asInitiator.theirTrip);
    expect(asOwner.theirTrip).toBe(asInitiator.myTrip);
  });

  it("uses offeredTrips[0].scheduleTrip when offeredTrip is missing", () => {
    const conversation = {
      initiatorId: "initiator-id",
      tradeOwnerId: "owner-id",
      postOwnerId: null,
      offeredTripId: null,
      trade: { scheduleTrip: ownerTrip },
      swapPost: null,
      offeredTrip: null,
      offeredTrips: [{ scheduleTrip: offeredTrip, scheduleTripId: "st-id" }],
    };
    const result = mapTripsForChat("initiator-id", conversation);
    expect(result.myTrip).toBe(offeredTrip);
    expect(result.theirTrip).toBe(ownerTrip);
    expect(result.currentOfferId).toBe("st-id");
  });

  it("returns null myTrip for unknown current user", () => {
    const conversation = {
      initiatorId: "initiator-id",
      tradeOwnerId: "owner-id",
      postOwnerId: null,
      offeredTripId: "offered-schedule-id",
      trade: { scheduleTrip: ownerTrip },
      swapPost: null,
      offeredTrip: offeredTrip,
      offeredTrips: null,
    };
    const result = mapTripsForChat("other-user-id", conversation);
    expect(result.myTrip).toBeNull();
    expect(result.theirTrip).toBe(ownerTrip);
  });
});
