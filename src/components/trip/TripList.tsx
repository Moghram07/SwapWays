"use client";

import { TripCard, tripToCardData } from "./TripCard";
import type { TripCardData } from "@/types/tripCard";

interface TripListProps {
  trips: TripCardData[];
  onSwap: (tripId: string) => void;
  onCancelSwap: (tripId: string) => void;
  onAcceptMatch: (matchId: string) => void;
  onDeclineMatch: (matchId: string) => void;
}

export function TripList({
  trips,
  onSwap,
  onCancelSwap,
  onAcceptMatch,
  onDeclineMatch,
}: TripListProps) {
  return (
    <div className="space-y-4">
      {trips.map((trip) => (
        <TripCard
          key={trip.scheduleTripId ?? trip.instanceId ?? `${trip.tripNumber}-${trip.startDate.toISOString()}`}
          trip={trip}
          onSwap={onSwap}
          onCancelSwap={onCancelSwap}
          onAcceptMatch={onAcceptMatch}
          onDeclineMatch={onDeclineMatch}
        />
      ))}
    </div>
  );
}

export { TripCard, tripToCardData } from "./TripCard";
export { TripCardHeader } from "./TripCardHeader";
export { TripTypeBadge } from "./TripTypeBadge";
export { TripLegItem } from "./TripLegItem";
export { TripLayoverBar } from "./TripLayoverBar";
export { TripSummaryFooter } from "./TripSummaryFooter";
export { SwapButton } from "./SwapButton";
export { SwapStatusBadge } from "./SwapStatusBadge";
