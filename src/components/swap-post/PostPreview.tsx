"use client";

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
  userDisplay: { firstName: string; rank: string; base: string };
  vacationYear?: number | "";
  vacationMonth?: number | "";
  vacationStartDay?: number | "";
  vacationEndDay?: number | "";
  desiredVacationMonths?: number[];
  onPost: () => void;
  onBack: () => void;
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
  vacationStartDay,
  vacationEndDay,
  desiredVacationMonths = [],
  onPost,
  onBack,
}: PostPreviewProps) {
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
  }));
  const offeredTrips =
    offeredTripsFromSchedule.length > 0
      ? offeredTripsFromSchedule
      : manualOfferedTrips.length > 0
        ? manualOfferedTrips.map((trip) => ({
            flightNumber: trip.flightNumber ?? "",
            destination: trip.tripType === "MULTI_STOP" ? (trip.destinations.find(Boolean) ?? "") : (trip.destination ?? ""),
            destinations:
              trip.tripType === "MULTI_STOP"
                ? trip.destinations.filter(Boolean)
                : trip.destination
                  ? [trip.destination]
                  : [],
            departureDate: new Date(`${trip.date}T00:00:00.000Z`),
            tripType: trip.tripType,
            creditHours: trip.blockHours ?? 0,
            hasLayover: trip.tripType === "LAYOVER",
            layoverHours: trip.layoverHours ?? null,
            reportTime: trip.reportTime ?? undefined,
          }))
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
      base: { name: userDisplay.base, airportCode: "" },
    },
    ...(postType === "VACATION_SWAP" &&
      vacationYear !== "" &&
      vacationMonth !== "" && {
        vacationYear: Number(vacationYear),
        vacationMonth: Number(vacationMonth),
        vacationStartDay: vacationStartDay === "" ? null : Number(vacationStartDay),
        vacationEndDay: vacationEndDay === "" ? null : Number(vacationEndDay),
        desiredVacationMonths: desiredVacationMonths,
      }),
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Preview your post</h2>
      <p className="text-sm text-slate-500">
        This is how your post will appear on the Trade Board.
      </p>

      <div className="rounded-xl border-2 border-dashed border-slate-300 p-4">
        <SwapPostTradeBoardCard post={post} isPreview />
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="text-sm text-slate-500 hover:underline">
          ← Back
        </button>
        <button
          type="button"
          onClick={onPost}
          className="rounded-xl px-8 py-3 text-sm font-medium text-white transition-opacity hover:opacity-95"
          style={{ backgroundColor: "#2668B0" }}
        >
          Post to Trade Board
        </button>
      </div>
    </div>
  );
}
