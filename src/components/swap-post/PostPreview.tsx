"use client";

import { useEffect, useRef, useState } from "react";
import type { SwapPostType } from "@/types/swapPost";
import type { WantCriteriaData } from "@/types/swapPost";
import type { TripOption } from "./TripSelector";
import type { QuickPostOfferedTripData } from "@/types/swapPost";
import { SwapPostTradeBoardCard } from "./TradeBoardCard";

interface PostPreviewProps {
  postType: SwapPostType;
  selectedTrips: TripOption[];
  selectedDaysOff: number[];
  wantCriteria: WantCriteriaData;
  offeredTrips?: QuickPostOfferedTripData[];
  userDisplay: { firstName: string; rank: string; base: string; baseAirportCode?: string };
  vacationYear?: number | "";
  vacationMonth?: number | "";
  desiredVacationMonths?: number[];
  onPost: () => void | Promise<void>;
  onBack: () => void;
  isSubmitting?: boolean;
}

export function PostPreview({
  postType,
  selectedTrips,
  selectedDaysOff,
  wantCriteria,
  offeredTrips: manualOfferedTrips = [],
  userDisplay,
  vacationYear,
  vacationMonth,
  desiredVacationMonths = [],
  onPost,
  onBack,
  isSubmitting = false,
}: PostPreviewProps) {
  const [isClickAcknowledged, setIsClickAcknowledged] = useState(false);
  const clickAckTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (clickAckTimerRef.current != null) {
        window.clearTimeout(clickAckTimerRef.current);
      }
    };
  }, []);

  const handlePostClick = () => {
    if (isSubmitting || isClickAcknowledged) return;
    setIsClickAcknowledged(true);
    if (clickAckTimerRef.current != null) {
      window.clearTimeout(clickAckTimerRef.current);
    }
    // Hold a short visible acknowledgement before network submit starts.
    clickAckTimerRef.current = window.setTimeout(async () => {
      clickAckTimerRef.current = null;
      try {
        await onPost();
      } finally {
        setIsClickAcknowledged(false);
      }
    }, 220);
  };

  const offeredTripsFromSchedule = selectedTrips.map((t) => ({
    flightNumber: t.legs[0]?.flightNumber ?? "",
    destination: t.legs[t.legs.length - 1]?.arrivalAirport ?? "",
    destinations: Array.from(
      new Set(t.legs.map((leg) => leg.arrivalAirport).filter((airport) => airport !== t.legs[0]?.departureAirport))
    ),
    departureDate: t.startDate,
    tripType: t.tripType,
    creditHours: t.creditHours,
    hasLayover: t.layovers.length > 0,
    layoverHours: t.layovers[0]?.durationDecimal ?? null,
    layoverCity: t.layovers[0]?.airport ?? null,
    blockHours: t.blockHours ?? null,
    legs: t.legs.map((leg, idx) => ({
      legOrder: idx,
      flightNumber: leg.flightNumber,
      isDeadhead: leg.flightNumber?.toUpperCase().startsWith("DH") ?? false,
      departureAirport: leg.departureAirport,
      arrivalAirport: leg.arrivalAirport,
    })),
  }));
  const offeredTrips =
    offeredTripsFromSchedule.length > 0
      ? offeredTripsFromSchedule
      : manualOfferedTrips.length > 0
        ? manualOfferedTrips.map((trip) => {
            const legs = trip.legs ?? [];
            const legLayoversData = legs.flatMap((l, i) =>
              l.hasLayover && l.layoverHours != null && l.layoverHours > 0
                ? [{ legIndex: i, layoverHours: l.layoverHours }]
                : []
            );
            const layoverCity =
              trip.tripType === "LAYOVER"
                ? (trip.destination ?? null)
                : null;
            return {
              flightNumber: trip.flightNumber ?? "",
              destination:
                trip.tripType === "MULTI_STOP"
                  ? (trip.destinations.find(Boolean) ?? "")
                  : (trip.destination ?? ""),
              destinations: trip.destinations?.length > 0
                ? trip.destinations.filter(Boolean)
                : trip.destination ? [trip.destination] : [],
              departureDate: new Date(`${trip.date}T00:00:00.000Z`),
              tripType: trip.tripType,
              creditHours: trip.blockHours ?? 0,
              hasLayover: trip.tripType === "LAYOVER",
              layoverHours: trip.layoverHours ?? (legLayoversData[0]?.layoverHours ?? null),
              layoverCity: layoverCity ?? null,
              legLayovers: legLayoversData.length > 0 ? legLayoversData : null,
              legDeadheads: trip.legDeadheads,
              reportTime: trip.reportTime ?? undefined,
            };
          })
        : [];

  const firstManualTrip = manualOfferedTrips[0];
  const post = {
    postType,
    offeredTrips,
    offeringDaysOff: false,
    offeredDaysOff: selectedDaysOff,
    wantType: wantCriteria.wantType,
    wantMinLayover: wantCriteria.wantMinLayover,
    wantEqualHours: wantCriteria.wantEqualHours,
    wantSameDate: wantCriteria.wantSameDate,
    wantDestinations: wantCriteria.wantDestinations,
    wantExclude: wantCriteria.wantExclude,
    wantAcceptanceOptions: wantCriteria.wantAcceptanceOptions ?? [],
    wtfDays: wantCriteria.wtfDays,
    wantDaysOff: wantCriteria.wantDaysOff,
    notes: wantCriteria.notes || null,
    source: (selectedTrips.length > 0 ? "SCHEDULE_PREFILL" : "MANUAL_QUICK") as
      | "MANUAL_QUICK"
      | "SCHEDULE_PREFILL",
    quickTripType: firstManualTrip?.tripType ?? null,
    quickDestinations:
      firstManualTrip?.tripType === "MULTI_STOP"
        ? firstManualTrip.destinations.filter(Boolean)
        : firstManualTrip?.destination
          ? [firstManualTrip.destination]
          : [],
    quickDate: firstManualTrip?.date ? new Date(`${firstManualTrip.date}T00:00:00.000Z`) : null,
    quickLayoverHours: firstManualTrip?.layoverHours ?? null,
    advancedReportTime: firstManualTrip?.reportTime ?? null,
    advancedAircraftTypeCode: firstManualTrip?.aircraftTypeCode ?? null,
    advancedBlockHours: firstManualTrip?.blockHours ?? null,
    advancedFlightNumber: firstManualTrip?.flightNumber ?? null,
    user: {
      firstName: userDisplay.firstName,
      rank: { name: userDisplay.rank, code: "" },
      base: { name: userDisplay.base, airportCode: userDisplay.baseAirportCode ?? "" },
    },
    ...(postType === "VACATION_SWAP" &&
      vacationYear !== "" &&
      vacationMonth !== "" && {
        vacationYear: Number(vacationYear),
        vacationMonth: Number(vacationMonth),
        desiredVacationMonths: desiredVacationMonths,
      }),
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-content">Preview your post</h2>
      <p className="text-sm text-muted">
        This is how your post will appear on Swaps.
      </p>

      <div className="rounded-xl border-2 border-dashed border-line p-4">
        <SwapPostTradeBoardCard post={post} isPreview />
      </div>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="rounded-lg border border-slate-800 bg-surface px-4 py-2 text-sm font-medium text-content hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handlePostClick}
          disabled={isSubmitting || isClickAcknowledged}
          aria-busy={isSubmitting || isClickAcknowledged}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-8 py-3 text-sm font-medium text-white transition-all duration-200 hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed sm:w-auto sm:min-w-[190px] ${
            isClickAcknowledged && !isSubmitting
              ? "scale-[0.98] bg-[#1f7f43]"
              : "bg-[#2668B0] disabled:opacity-70"
          }`}
        >
          {isSubmitting && (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-white"
              aria-hidden
            />
          )}
          <span>
            {isSubmitting
              ? "Posting..."
              : isClickAcknowledged
                ? "Submitting..."
                : "Post to Swaps"}
          </span>
        </button>
      </div>
    </div>
  );
}
