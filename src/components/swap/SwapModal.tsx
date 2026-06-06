"use client";

import { useState } from "react";
import { TripTypeBadge } from "@/components/trip/TripTypeBadge";
import { getTripTypeInfo } from "@/utils/tripClassifier";
import { getAirportCity } from "@/utils/airportNames";
import { buildTripRouteChainNodes } from "@/utils/multiStopRouteDisplay";
import { RouteChain } from "@/components/RouteChain";
import { formatFlightNumber } from "@/utils/flightNumber";
import { decimalHoursToDisplayTime, formatZuluTime } from "@/utils/timeUtils";
import type { TripCardData } from "@/types/tripCard";
import { DesiredDestinations } from "./DesiredDestinations";
import { WtfDayPicker } from "./WtfDayPicker";

export interface SwapPreferences {
  scheduleTripId: string;
  desiredDestinations: string[];
  wtfDays: number[];
  notes: string;
}

interface SwapModalProps {
  trip: TripCardData | null;
  scheduledDays: number[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (preferences: SwapPreferences) => Promise<void>;
}

export function SwapModal({
  trip,
  scheduledDays,
  isOpen,
  onClose,
  onSubmit,
}: SwapModalProps) {
  const [desiredDestinations, setDesiredDestinations] = useState<string[]>([]);
  const [wtfDays, setWtfDays] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !trip || !trip.scheduleTripId) return null;

  const typeInfo = getTripTypeInfo(trip.tripType);

  async function handleSubmit() {
    if (!trip?.scheduleTripId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        scheduleTripId: trip.scheduleTripId,
        desiredDestinations,
        wtfDays,
        notes,
      });
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      const msg =
        err instanceof Error ? err.message : "Failed to post swap. Please try again.";
      setError(msg);
    }
  }

  const month = trip.startDate.getMonth() + 1;
  const year = trip.startDate.getFullYear();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-lg font-semibold text-content">Swap this trip</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted hover:text-content-soft"
          >
            Close
          </button>
        </div>

        <div className="border-b border-line bg-surface-2 px-6 py-4">
          <TripSummaryReadOnly trip={trip} typeInfo={typeInfo} />
        </div>

        <div className="space-y-5 px-6 py-4">
          <DesiredDestinations
            selected={desiredDestinations}
            onChange={setDesiredDestinations}
          />

          <WtfDayPicker
            selectedDays={wtfDays}
            scheduledDays={scheduledDays}
            month={month}
            year={year}
            onChange={setWtfDays}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-content-soft">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any preferences or details for potential swap partners..."
              className="h-24 w-full text-content bg-surface border border-line rounded-lg px-3 py-2 text-sm placeholder:text-faint resize-none focus:outline-none focus:ring-2 focus:ring-[#1E6FB9] focus:border-[#1E6FB9]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted hover:text-content"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-lg bg-slate-800 px-6 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {isSubmitting ? "Posting…" : "Post Swap"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TripSummaryReadOnly({
  trip,
  typeInfo,
}: {
  trip: TripCardData;
  typeInfo: ReturnType<typeof getTripTypeInfo>;
}) {
  const firstLeg = trip.legs[0];
  const routeChain = buildTripRouteChainNodes({
    destination: trip.destinations[trip.destinations.length - 1] ?? "",
    destinations: trip.destinations,
    legs: trip.legs,
    layoverCity: trip.layovers?.[0]?.airport ?? null,
    layoverHours: trip.layovers?.[0]?.durationDecimal ?? null,
  });
  const layover = trip.layovers[0];

  const dateRange = formatTripDateRange(trip);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <TripTypeBadge typeInfo={typeInfo} />
        {firstLeg && formatFlightNumber(firstLeg.flightNumber) && (
          <span className="font-semibold">{formatFlightNumber(firstLeg.flightNumber)}</span>
        )}
        <RouteChain nodes={routeChain} className="text-sm text-content-soft" />
      </div>
      <div className="text-sm text-muted">{dateRange}</div>
      {layover && (
        <div className="text-sm font-medium text-[#3BA34A]">
          Layover in {getAirportCity(layover.airport)} —{" "}
          {decimalHoursToDisplayTime(layover.durationDecimal)}
        </div>
      )}
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        <span>
          Block: <strong>{decimalHoursToDisplayTime(trip.blockHours)}</strong>
        </span>
        <span>
          TAFB: <strong>{decimalHoursToDisplayTime(trip.tafb)}</strong>
        </span>
        {trip.reportTime && (
          <span>
            Report: <strong>{formatZuluTime(trip.reportTime)}</strong>
          </span>
        )}
      </div>
    </div>
  );
}

function formatTripDateRange(trip: TripCardData): string {
  const startDate = trip.legs[0]?.departureDate ?? trip.startDate;
  const lastLeg = trip.legs[trip.legs.length - 1];
  const endDate = lastLeg?.arrivalDate ?? lastLeg?.departureDate ?? trip.endDate;
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  };
  const startStr = startDate.toLocaleDateString("en-US", opts);
  if (!endDate || startDate.toDateString() === endDate.toDateString()) {
    return startStr;
  }
  const endStr = endDate.toLocaleDateString("en-US", opts);
  return `${startStr} – ${endStr}`;
}

