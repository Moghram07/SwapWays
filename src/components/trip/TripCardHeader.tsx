"use client";

import { TripTypeBadge } from "./TripTypeBadge";
import { SwapButton } from "./SwapButton";
import { SwapStatusBadge } from "./SwapStatusBadge";
import { getAirportDisplay } from "@/utils/airportNames";
import { formatZuluTime } from "@/utils/timeUtils";
import { zuluToLocal, getLocalDateFromZulu } from "@/utils/airportTimezones";
import { formatLocalDate } from "@/utils/dateUtils";
import type { TripCardData } from "@/types/tripCard";
import type { TripTypeInfo } from "@/utils/tripClassifier";

const UTC_DATE_OPTS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
};

function formatTripDateRange(
  trip: TripCardData,
  timeMode: "zulu" | "local" = "zulu"
): string {
  const firstLeg = trip.legs[0];
  const lastLeg = trip.legs[trip.legs.length - 1];
  if (!firstLeg) return "";

  if (timeMode === "local") {
    const startLocal = getLocalDateFromZulu(
      firstLeg.departureDate,
      firstLeg.departureTime,
      firstLeg.departureAirport
    );
    const startStr = formatLocalDate(startLocal, { weekday: true, year: false });
    const endDate = lastLeg?.arrivalDate ?? lastLeg?.departureDate;
    if (!endDate || !lastLeg) return startStr;
    const endLocal = getLocalDateFromZulu(
      endDate,
      lastLeg.arrivalTime,
      lastLeg.arrivalAirport
    );
    const endStr = formatLocalDate(endLocal, { weekday: true, year: false });
    if (
      startLocal.year === endLocal.year &&
      startLocal.month === endLocal.month &&
      startLocal.day === endLocal.day
    ) {
      return startStr;
    }
    return `${startStr} – ${endStr}`;
  }

  const startDate = firstLeg.departureDate;
  const endDate = lastLeg?.arrivalDate ?? lastLeg?.departureDate;
  const startStr = startDate.toLocaleDateString("en-US", UTC_DATE_OPTS);
  if (!endDate || startDate.toDateString() === endDate.toDateString()) {
    return startStr;
  }
  const endStr = endDate.toLocaleDateString("en-US", UTC_DATE_OPTS);
  return `${startStr} – ${endStr}`;
}

interface TripCardHeaderProps {
  trip: TripCardData;
  typeInfo: TripTypeInfo;
  onSwap: (tripId: string) => void;
  onCancelSwap: (tripId: string) => void;
  onAcceptMatch: (matchId: string) => void;
  onDeclineMatch: (matchId: string) => void;
  /** When "local", report and leg times show local; otherwise Zulu. */
  timeMode?: "zulu" | "local";
  /** Airport code for report-time local conversion (e.g. base). Falls back to first leg departure. */
  baseAirportCode?: string;
  /** Called when user clicks Edit (only shown when trip has scheduleTripId). */
  onEdit?: (trip: TripCardData) => void;
}

function CardActions({
  trip,
  onSwap,
  onCancelSwap,
  onAcceptMatch,
  onDeclineMatch,
}: TripCardHeaderProps) {
  switch (trip.swapStatus) {
    case "posted":
      return (
        <>
          <SwapStatusBadge status="posted" />
          <button
            type="button"
            onClick={() => onCancelSwap(trip.tradeId ?? trip.tripNumber)}
            className="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-700"
          >
            Cancel Swap
          </button>
        </>
      );
    case "matched":
      return (
        <>
          <SwapStatusBadge status="matched" />
          <button
            type="button"
            onClick={() => trip.matchId && onAcceptMatch(trip.matchId)}
            className="rounded-lg bg-[#3BA34A] px-3 py-1.5 text-sm font-medium text-white"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => trip.matchId && onDeclineMatch(trip.matchId)}
            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
          >
            Decline
          </button>
        </>
      );
    case "accepted":
      return (
        <>
          <SwapStatusBadge status="accepted" />
          <button
            type="button"
            onClick={() => onCancelSwap(trip.tradeId ?? trip.tripNumber)}
            className="px-3 py-1 text-sm text-red-500 hover:text-red-600"
          >
            Cancel
          </button>
        </>
      );
    case "completed":
      return <SwapStatusBadge status="completed" />;
    default:
      return <SwapButton tripId={trip.tradeId ?? trip.tripNumber} onSwap={onSwap} />;
  }
}

export function TripCardHeader({
  trip,
  typeInfo,
  onSwap,
  onCancelSwap,
  onAcceptMatch,
  onDeclineMatch,
  timeMode = "zulu",
  baseAirportCode,
  onEdit,
}: TripCardHeaderProps) {
  const destinationLabel = trip.destinations
    .map((code) => getAirportDisplay(code))
    .join(" + ");
  const prefix = trip.airlineCode ?? "SV";
  const primaryFlightNumber = trip.legs[0]
    ? `${prefix}${trip.legs[0].flightNumber}`
    : "";
  const dateLabel = formatTripDateRange(trip, timeMode);
  const reportAirport = baseAirportCode ?? trip.legs[0]?.departureAirport ?? "";
  const reportLabel =
    trip.reportTime &&
    (timeMode === "local" && reportAirport
      ? zuluToLocal(trip.reportTime, reportAirport).label + " local"
      : formatZuluTime(trip.reportTime));

  return (
    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
      <div className="flex items-center gap-3">
        <TripTypeBadge typeInfo={typeInfo} />
        <div>
          <span className="font-semibold text-gray-900">
            {primaryFlightNumber}
          </span>
          <span className="mx-2 text-gray-500">·</span>
          <span className="text-sm text-gray-600">{destinationLabel}</span>
          <span className="mx-2 text-gray-500">·</span>
          <span className="text-sm text-gray-500">{dateLabel}</span>
          {reportLabel && (
            <>
              <span className="mx-2 text-gray-500">·</span>
              <span className="text-sm text-gray-600">
                Report:{" "}
                <span
                  className={
                    timeMode === "local"
                      ? "font-medium text-green-600"
                      : "font-medium text-blue-600"
                  }
                >
                  {reportLabel}
                </span>
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {trip.scheduleTripId && onEdit && (
          <button
            type="button"
            onClick={() => onEdit(trip)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>
        )}
        <CardActions
          trip={trip}
          typeInfo={typeInfo}
          onSwap={onSwap}
          onCancelSwap={onCancelSwap}
          onAcceptMatch={onAcceptMatch}
          onDeclineMatch={onDeclineMatch}
        />
      </div>
    </div>
  );
}
