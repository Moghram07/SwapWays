"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TripCard } from "@/components/trip/TripCard";
import { EditTripModal } from "@/components/trip/EditTripModal";
import type { TripCardData } from "@/types/tripCard";

/** Rehydrate date strings to Date after server serialization */
function parseCardDates(card: TripCardData): TripCardData {
  return {
    ...card,
    startDate: new Date(card.startDate),
    endDate: new Date(card.endDate),
    legs: card.legs.map((leg) => ({
      ...leg,
      departureDate: new Date(leg.departureDate),
    })),
  };
}

interface MyFlightsTripCardsProps {
  scheduledCards: TripCardData[];
  tradeCards: TripCardData[];
  baseAirportCode?: string | null;
}

export function MyFlightsTripCards({
  scheduledCards,
  tradeCards,
  baseAirportCode,
}: MyFlightsTripCardsProps) {
  const router = useRouter();
  const [editingTrip, setEditingTrip] = useState<TripCardData | null>(null);

  const handleCancelSwap = async (id: string) => {
    const res = await fetch(`/api/trades/${id}/cancel`, { method: "PATCH" });
    if (res.ok) router.refresh();
  };

  const handleSwapTradeCard = (tripIdOrTradeId: string) => {
    const card = tradeCards.find(
      (c) => c.tradeId === tripIdOrTradeId || c.tripNumber === tripIdOrTradeId
    );
    if (card?.tradeId) {
      window.location.href = `/dashboard/browse?trade=${card.tradeId}`;
    }
  };

  const handleSwapScheduledTrip = (trip: TripCardData) => {
    if (trip.scheduleTripId) {
      router.push(`/dashboard/add-trade?tripId=${trip.scheduleTripId}`);
    }
  };

  const parsedScheduledCards = useMemo(
    () => scheduledCards.map((card) => parseCardDates(card)),
    [scheduledCards]
  );

  return (
    <>
      {editingTrip?.scheduleTripId && (
        <EditTripModal
          scheduleTripId={editingTrip.scheduleTripId}
          trip={editingTrip}
          onClose={() => setEditingTrip(null)}
          onSaved={() => {
            setEditingTrip(null);
            router.refresh();
          }}
        />
      )}
      {parsedScheduledCards.length > 0 && (
        <ul className="mt-4 space-y-3">
          {parsedScheduledCards.map((parsed, index) => (
            <li
              key={`sched-${index}-${parsed.scheduleTripId ?? parsed.tripNumber}-${parsed.startDate.toISOString()}`}
            >
              <TripCard
                trip={parsed}
                onSwap={(_id) => handleSwapScheduledTrip(parsed)}
                onCancelSwap={handleCancelSwap}
                onAcceptMatch={() => {}}
                onDeclineMatch={() => {}}
                baseAirportCode={baseAirportCode ?? undefined}
                onEdit={parsed.scheduleTripId ? () => setEditingTrip(parsed) : undefined}
              />
            </li>
          ))}
        </ul>
      )}
      {tradeCards.length > 0 && (
        <ul className="mt-4 space-y-3">
          {tradeCards.map((card) => {
            const parsed = parseCardDates(card);
            return (
              <li key={`trade-${card.tradeId ?? card.tripNumber}`}>
                <TripCard
                  trip={parsed}
                  onSwap={handleSwapTradeCard}
                  onCancelSwap={handleCancelSwap}
                  onAcceptMatch={() => {}}
                  onDeclineMatch={() => {}}
                  baseAirportCode={baseAirportCode ?? undefined}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
