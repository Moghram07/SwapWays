"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { EditTripModal } from "@/components/trip/EditTripModal";
import { TripTypeBadge } from "@/components/trip/TripTypeBadge";
import { TripLegItem } from "@/components/trip/TripLegItem";
import { TripLayoverBar } from "@/components/trip/TripLayoverBar";
import { TripSummaryFooter } from "@/components/trip/TripSummaryFooter";
import { SwapStatusBadge } from "@/components/trip/SwapStatusBadge";
import { getTripTypeInfo } from "@/utils/tripClassifier";
import { formatZuluTime } from "@/utils/timeUtils";
import { zuluToLocal } from "@/utils/airportTimezones";
import { useTimeFormat } from "@/hooks/useTimeFormat";
import type { TripCardData } from "@/types/tripCard";

const UTC_DATE_OPTS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
};

function formatTripDate(trip: TripCardData): string {
  const firstLeg = trip.legs[0];
  const lastLeg = trip.legs[trip.legs.length - 1];
  if (!firstLeg) return "";
  const startStr = trip.startDate.toLocaleDateString("en-US", UTC_DATE_OPTS);
  const endDate = lastLeg?.arrivalDate ?? lastLeg?.departureDate;
  if (!endDate || trip.startDate.toDateString() === endDate.toDateString()) return startStr;
  return `${startStr} – ${endDate.toLocaleDateString("en-US", UTC_DATE_OPTS)}`;
}

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

interface FlightCardProps {
  trip: TripCardData;
  onSwap: () => void;
  onCancelSwap: (id: string) => void;
  onEdit?: () => void;
}

function FlightCard({ trip, onSwap, onCancelSwap, onEdit }: FlightCardProps) {
  const { format: timeMode } = useTimeFormat();
  const typeInfo = getTripTypeInfo(trip.tripType);
  const dateLabel = formatTripDate(trip);
  const reportAirport = trip.legs[0]?.departureAirport ?? "";
  const reportLabel = trip.reportTime
    ? timeMode === "local" && reportAirport
      ? zuluToLocal(trip.reportTime, reportAirport).label
      : formatZuluTime(trip.reportTime)
    : null;

  return (
    <div
      className={`overflow-hidden rounded-xl border border-line bg-surface shadow-sm border-s-4 ${typeInfo.borderColor}`}
    >
      {/* Compact header — no route chain / swap card preview */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <TripTypeBadge typeInfo={typeInfo} />
          <span className="text-sm text-muted">{dateLabel}</span>
          {reportLabel && (
            <span className="text-sm text-muted">
              Report:{" "}
              <span className={`font-medium ${timeMode === "local" ? "text-green-600" : "text-blue-600"}`}>
                {reportLabel}
              </span>
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Swap status badges */}
          {trip.swapStatus === "posted" && (
            <>
              <SwapStatusBadge status="posted" />
              <button
                type="button"
                onClick={() => onCancelSwap(trip.tradeId ?? trip.tripNumber)}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Cancel
              </button>
            </>
          )}
          {trip.swapStatus === "matched" && <SwapStatusBadge status="matched" />}
          {trip.swapStatus === "accepted" && <SwapStatusBadge status="accepted" />}
          {trip.swapStatus === "completed" && <SwapStatusBadge status="completed" />}
          {/* Post Swap — only when not already in a swap state */}
          {!trip.swapStatus && (
            <button
              type="button"
              onClick={onSwap}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              Post Swap
            </button>
          )}
          {/* Edit button */}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-content-soft hover:bg-surface-2"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Leg details — the "ticket" part */}
      <div className="space-y-1 px-5 py-3">
        {trip.legs.map((leg, index) => (
          <div key={`${leg.flightNumber}-${index}`}>
            <TripLegItem leg={leg} legNumber={index + 1} timeMode={timeMode} />
            {trip.layovers.find((l) => l.afterLegNumber === index + 1) && (
              <TripLayoverBar
                layover={trip.layovers.find((l) => l.afterLegNumber === index + 1)!}
              />
            )}
          </div>
        ))}
      </div>

      <TripSummaryFooter
        blockHours={trip.blockHours}
        tafb={trip.tafb}
        creditHours={trip.creditHours}
      />
    </div>
  );
}

interface MyFlightsTripCardsProps {
  scheduledCards: TripCardData[];
  tradeCards: TripCardData[];
  baseAirportCode?: string | null;
}

export function MyFlightsTripCards({
  scheduledCards,
  tradeCards,
}: MyFlightsTripCardsProps) {
  const router = useRouter();
  const [editingTrip, setEditingTrip] = useState<TripCardData | null>(null);

  const handleCancelSwap = async (id: string) => {
    const res = await fetch(`/api/trades/${id}/cancel`, { method: "PATCH" });
    if (res.ok) router.refresh();
  };

  const parsedScheduledCards = useMemo(
    () => scheduledCards.map((card) => parseCardDates(card)),
    [scheduledCards]
  );

  const parsedTradeCards = useMemo(
    () => tradeCards.map((card) => parseCardDates(card)),
    [tradeCards]
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
              <FlightCard
                trip={parsed}
                onSwap={() => {
                  if (parsed.scheduleTripId) {
                    router.push(`/dashboard/add-trade?tripId=${parsed.scheduleTripId}`);
                  }
                }}
                onCancelSwap={handleCancelSwap}
                onEdit={parsed.scheduleTripId ? () => setEditingTrip(parsed) : undefined}
              />
            </li>
          ))}
        </ul>
      )}

      {parsedTradeCards.length > 0 && (
        <ul className="mt-4 space-y-3">
          {parsedTradeCards.map((card) => {
            const parsed = parseCardDates(card);
            return (
              <li key={`trade-${card.tradeId ?? card.tripNumber}`}>
                <FlightCard
                  trip={parsed}
                  onSwap={() => {
                    if (card.tradeId) {
                      window.location.href = `/dashboard/browse?trade=${card.tradeId}`;
                    }
                  }}
                  onCancelSwap={handleCancelSwap}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
