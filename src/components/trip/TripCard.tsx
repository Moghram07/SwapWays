"use client";

import { TripCardHeader } from "./TripCardHeader";
import { TripLegItem } from "./TripLegItem";
import { TripLayoverBar } from "./TripLayoverBar";
import { TripSummaryFooter } from "./TripSummaryFooter";
import { getTripTypeInfo } from "@/utils/tripClassifier";
import type { TripCardData } from "@/types/tripCard";
import { useTimeFormat } from "@/hooks/useTimeFormat";

export { tripToCardData, tradeToCardData } from "@/utils/tripCardData";

interface TripCardProps {
  trip: TripCardData;
  onSwap: (tripId: string) => void;
  onCancelSwap: (tripId: string) => void;
  onAcceptMatch: (matchId: string) => void;
  onDeclineMatch: (matchId: string) => void;
  timeMode?: "zulu" | "local";
  baseAirportCode?: string;
  onEdit?: (trip: TripCardData) => void;
}

export function TripCard({
  trip,
  onSwap,
  onCancelSwap,
  onAcceptMatch,
  onDeclineMatch,
  timeMode,
  baseAirportCode,
  onEdit,
}: TripCardProps) {
  const typeInfo = getTripTypeInfo(trip.tripType);
  const borderColor = typeInfo.borderColor;
  const { format: globalFormat } = useTimeFormat();
  const effectiveTimeMode = timeMode ?? globalFormat;

  return (
    <div
      className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md border-l-4 ${borderColor}`}
    >
      <TripCardHeader
        trip={trip}
        typeInfo={typeInfo}
        onSwap={onSwap}
        onCancelSwap={onCancelSwap}
        onAcceptMatch={onAcceptMatch}
        onDeclineMatch={onDeclineMatch}
        timeMode={effectiveTimeMode}
        baseAirportCode={baseAirportCode}
        onEdit={onEdit}
      />
      <div className="space-y-1 px-5 py-3">
        {trip.legs.map((leg, index) => (
          <div key={`${leg.flightNumber}-${index}`}>
            <TripLegItem leg={leg} legNumber={index + 1} timeMode={effectiveTimeMode} />
            {trip.layovers.find((l) => l.afterLegNumber === index + 1) && (
              <TripLayoverBar
                layover={
                  trip.layovers.find((l) => l.afterLegNumber === index + 1)!
                }
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
