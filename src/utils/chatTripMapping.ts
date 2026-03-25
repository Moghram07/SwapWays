/**
 * Maps conversation trade/swap data to "my trip" and "their trip" for the chat UI
 * so that the correct trip appears in the correct box for each participant.
 *
 * Rule:
 * - The trade/post owner is the user who created the Trade Board post (tradeOwnerId or postOwnerId).
 * - The initiator is the user who started the conversation (initiatorId).
 * - Owner's trip = the trip on the board (trade.scheduleTrip or swapPost.offeredTrips[0].scheduleTrip).
 * - Initiator's offered trip = the trip the initiator offered (offeredTrip or offeredTrips[0].scheduleTrip).
 *
 * For the current user:
 * - If I am the owner → myTrip = owner's trip, theirTrip = initiator's offered trip.
 * - If I am the initiator → myTrip = initiator's offered trip, theirTrip = owner's trip.
 */

export interface ConversationTripPayload {
  initiatorId: string;
  tradeOwnerId?: string | null;
  postOwnerId?: string | null;
  offeredTripId?: string | null;
  trade?: { scheduleTrip?: unknown } | null;
  swapPost?: { offeredTrips: { scheduleTrip?: unknown }[] } | null;
  offeredTrip?: unknown | null;
  offeredTrips?: { scheduleTrip?: unknown; scheduleTripId?: string }[] | null;
}

export interface MapTripsForChatResult {
  /** Trip that belongs to the current user (shown in "Your trip" / first box). */
  myTrip: unknown | null;
  /** Trip that belongs to the other participant (shown in "Their trip" / second box). */
  theirTrip: unknown | null;
  /** The scheduleTripId of the current user's offered trip (for initiator: their selection; for owner: null). */
  currentOfferId: string | null;
}

/**
 * Returns { myTrip, theirTrip, currentOfferId } for the chat trip comparison bar.
 * Uses tradeOwnerId/postOwnerId and initiatorId so both participants see their own trip in "my" box.
 */
export function mapTripsForChat(
  currentUserId: string,
  conversation: ConversationTripPayload
): MapTripsForChatResult {
  const ownerId = conversation.tradeOwnerId ?? conversation.postOwnerId ?? null;
  const isOwner = ownerId !== null && currentUserId === ownerId;
  const isInitiator = conversation.initiatorId === currentUserId;

  const ownerTrip =
    conversation.trade?.scheduleTrip ??
    (conversation.swapPost?.offeredTrips as { scheduleTrip?: unknown }[] | undefined)?.[0]?.scheduleTrip ??
    null;

  const offeredTrip =
    conversation.offeredTrip ??
    (conversation.offeredTrips as { scheduleTrip?: unknown }[] | undefined)?.[0]?.scheduleTrip ??
    null;

  const currentOfferId =
    conversation.offeredTripId ??
    (conversation.offeredTrips as { scheduleTripId?: string }[] | undefined)?.[0]?.scheduleTripId ??
    null;

  if (!currentUserId) {
    return {
      myTrip: null,
      theirTrip: ownerTrip ?? offeredTrip,
      currentOfferId: currentOfferId ?? null,
    };
  }

  if (isOwner) {
    return {
      myTrip: ownerTrip,
      theirTrip: offeredTrip,
      currentOfferId: null,
    };
  }

  if (isInitiator) {
    return {
      myTrip: offeredTrip,
      theirTrip: ownerTrip,
      currentOfferId: currentOfferId ?? null,
    };
  }

  return {
    myTrip: null,
    theirTrip: ownerTrip ?? offeredTrip,
    currentOfferId: currentOfferId ?? null,
  };
}
