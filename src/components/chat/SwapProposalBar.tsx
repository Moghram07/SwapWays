"use client";

interface ConversationForBar {
  id: string;
  status: string;
  initiatorId: string;
  offeredTripId?: string | null;
  offeredTrips?: unknown[];
}

interface SwapProposalBarProps {
  conversation: ConversationForBar;
  currentUserId: string;
  lastSwapProposedByInitiator?: boolean;
  onPropose: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onOfferChanged: () => void;
}

export function SwapProposalBar({
  conversation,
  currentUserId,
  lastSwapProposedByInitiator = false,
  onPropose,
  onAccept,
  onDecline,
  onOfferChanged: _onOfferChanged,
}: SwapProposalBarProps) {
  const isInitiator = conversation.initiatorId === currentUserId;
  const hasOffer =
    conversation.offeredTripId ??
    (conversation.offeredTrips as { scheduleTripId?: string }[])?.[0]?.scheduleTripId;

  switch (conversation.status) {
    case "ACTIVE":
      return (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center gap-3">
          {hasOffer && (
            <button
              type="button"
              onClick={onPropose}
              className="px-4 py-2 text-sm font-medium bg-[#2DAF66] text-white rounded-lg hover:bg-[#269952] shrink-0"
            >
              Propose Swap
            </button>
          )}
          {isInitiator && !hasOffer && (
            <p className="text-sm text-slate-500">Select a trip above to propose a swap.</p>
          )}
        </div>
      );

    case "SWAP_PROPOSED":
      if (lastSwapProposedByInitiator === isInitiator) {
        return (
          <div className="px-4 py-3 border-t border-slate-200 bg-[#E8F5EA] text-center">
            <p className="text-sm text-[#3BA34A] font-medium">
              Swap proposed — waiting for response
            </p>
          </div>
        );
      }
      return (
        <div className="px-4 py-3 border-t border-slate-200 bg-[#E8F5EA] flex items-center justify-center gap-3 flex-wrap">
          <p className="text-sm text-[#3BA34A] font-medium mr-4">
            Swap proposed!
          </p>
          <button
            type="button"
            onClick={onAccept}
            className="px-5 py-2 text-sm font-medium bg-[#3BA34A] text-white rounded-lg hover:bg-[#339040]"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="px-5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
          >
            Decline
          </button>
        </div>
      );

    case "SWAP_ACCEPTED":
      return (
        <div className="px-4 py-3 border-t border-slate-200 bg-[#E8F5EA] text-center">
          <p className="text-sm text-[#3BA34A] font-medium">
            Swap accepted! Coordinate with crew scheduling to finalize.
          </p>
        </div>
      );

    case "DECLINED":
      return (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-100 text-center">
          <p className="text-sm text-slate-500">This conversation has been closed.</p>
        </div>
      );

    default:
      return null;
  }
}
