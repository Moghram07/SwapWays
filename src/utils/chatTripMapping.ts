/**
 * Maps conversation trade/swap data to "my trip" and "their trip" for the chat UI
 * so that the correct trip appears in the correct box for each participant.
 *
 * Rule:
 * - The trade/post owner is the user who created the Trade Board post (tradeOwnerId or postOwnerId).
 * - The initiator is the user who started the conversation (initiatorId).
 * - Owner's trip = the trip on the board (their posted trip).
 * - Initiator's offered trip = the trip the initiator chose to offer.
 *
 * For the current user:
 * - If I am the owner → myTrip = owner's trip, theirTrip = initiator's offered trip.
 * - If I am the initiator → myTrip = initiator's offered trip, theirTrip = owner's trip.
 *
 * A trip may come from an uploaded ScheduleTrip OR a posted SwapPostTrip (manual entry,
 * for users with no schedule). Both are normalized server-side into a `ChatTripView`.
 */

import { buildTripRouteChainNodes } from "@/utils/multiStopRouteDisplay";

/** Normalized, render-ready trip shape consumed by the chat TripMiniSummary. */
export interface ChatTripView {
  startDate: string | Date;
  reportTime: string | null;
  legs: {
    flightNumber: string;
    departureAirport: string;
    arrivalAirport: string;
    departureTime?: string;
    arrivalTime?: string;
  }[];
  layovers: unknown[];
  /** Manual trips store local times and have no per-leg times — render report time as-is. */
  isManual?: boolean;
}

/** Mini ScheduleTrip select shape used by the conversation GET route. */
export interface ScheduleTripMini {
  startDate: string | Date;
  reportTime?: string | null;
  legs: {
    flightNumber: string;
    departureAirport: string;
    arrivalAirport: string;
    departureTime?: string | null;
    arrivalTime?: string | null;
    legOrder?: number;
  }[];
  layovers?: unknown[];
}

/** Manual SwapPostTrip fields needed to reconstruct a route for display. */
export interface ManualSwapTrip {
  destination: string;
  destinations: string[];
  departureDate: string | Date;
  reportTime?: string | null;
  flightNumber?: string | null;
  hasLayover: boolean;
  layoverCity?: string | null;
  layoverHours?: number | null;
  legLayovers?: unknown;
}

export function scheduleTripToView(mini: ScheduleTripMini): ChatTripView {
  return {
    startDate: mini.startDate,
    reportTime: mini.reportTime ?? null,
    legs: mini.legs.map((l) => ({
      flightNumber: l.flightNumber,
      departureAirport: l.departureAirport,
      arrivalAirport: l.arrivalAirport,
      departureTime: l.departureTime ?? undefined,
      arrivalTime: l.arrivalTime ?? undefined,
    })),
    layovers: mini.layovers ?? [],
    isManual: false,
  };
}

/**
 * Build a render-ready view for a manual (no-schedule) trip by reconstructing its route
 * from the stored destinations + the trip owner's base — the same chain the board cards show.
 */
export function manualSwapTripToView(t: ManualSwapTrip, baseCode: string | null): ChatTripView {
  const nodes = buildTripRouteChainNodes({
    destination: t.destination,
    destinations: t.destinations,
    baseCode: baseCode || undefined,
    layoverCity: t.layoverCity ?? null,
    layoverHours: t.layoverHours ?? null,
    legLayovers: (t.legLayovers as Array<{ legIndex: number; layoverHours?: number; hours?: number }> | null) ?? null,
    legs: null,
  });
  const codes = nodes.map((n) => n.code);
  const legs: ChatTripView["legs"] = [];
  for (let i = 0; i < codes.length - 1; i++) {
    legs.push({
      flightNumber: i === 0 ? (t.flightNumber ?? "") : "",
      departureAirport: codes[i],
      arrivalAirport: codes[i + 1],
    });
  }
  return {
    startDate: t.departureDate,
    reportTime: t.reportTime ?? null,
    // A single placeholder layover makes classifyTrip() report LAYOVER for manual layover trips.
    layovers: t.hasLayover ? [{}] : [],
    legs,
    isManual: true,
  };
}

export interface ConversationTripPayload {
  initiatorId: string;
  tradeOwnerId?: string | null;
  postOwnerId?: string | null;
  /** Server-normalized views (preferred). */
  ownerTripView?: ChatTripView | null;
  initiatorTripView?: ChatTripView | null;
  currentOfferId?: string | null;
}

export interface MapTripsForChatResult {
  /** Trip that belongs to the current user (shown in "Your trip" / first box). */
  myTrip: ChatTripView | null;
  /** Trip that belongs to the other participant (shown in "Their trip" / second box). */
  theirTrip: ChatTripView | null;
  /** The id (scheduleTripId or swapPostTripId) of the current user's offered trip. */
  currentOfferId: string | null;
}

/**
 * Returns { myTrip, theirTrip, currentOfferId } for the chat trip comparison bar,
 * swapping the server-provided owner/initiator views based on who the viewer is.
 */
export function mapTripsForChat(
  currentUserId: string,
  conversation: ConversationTripPayload
): MapTripsForChatResult {
  const ownerId = conversation.tradeOwnerId ?? conversation.postOwnerId ?? null;
  const isOwner = ownerId !== null && currentUserId === ownerId;
  const isInitiator = conversation.initiatorId === currentUserId;

  const ownerTrip = conversation.ownerTripView ?? null;
  const offeredTrip = conversation.initiatorTripView ?? null;
  const currentOfferId = conversation.currentOfferId ?? null;

  if (!currentUserId) {
    return { myTrip: null, theirTrip: ownerTrip ?? offeredTrip, currentOfferId };
  }
  if (isOwner) {
    return { myTrip: ownerTrip, theirTrip: offeredTrip, currentOfferId: null };
  }
  if (isInitiator) {
    return { myTrip: offeredTrip, theirTrip: ownerTrip, currentOfferId };
  }
  return { myTrip: null, theirTrip: ownerTrip ?? offeredTrip, currentOfferId };
}
