"use client";

import type { SwapPostType } from "@/types/swapPost";
import type { WantCriteriaData } from "@/types/swapPost";
import type { TripOption } from "./TripSelector";
import type { QuickPostAdvancedData, QuickPostTripData } from "@/types/swapPost";
import { SwapPostTradeBoardCard } from "./TradeBoardCard";

interface PostPreviewProps {
  postType: SwapPostType;
  selectedTrips: TripOption[];
  selectedDaysOff: number[];
  wantCriteria: WantCriteriaData;
  quickTrip?: QuickPostTripData;
  advanced?: QuickPostAdvancedData;
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
  quickTrip,
  advanced,
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
    departureDate: t.startDate,
    tripType: t.tripType,
    creditHours: t.creditHours,
    hasLayover: t.layovers.length > 0,
    layoverHours: t.layovers[0]?.durationDecimal ?? null,
  }));
  const offeredTrips =
    offeredTripsFromSchedule.length > 0
      ? offeredTripsFromSchedule
      : quickTrip
        ? [
            {
              flightNumber: advanced?.flightNumber ?? "",
              destination: quickTrip.destinations[0] ?? "",
              destinations: quickTrip.destinations,
              departureDate: new Date(`${quickTrip.date}T00:00:00.000Z`),
              tripType: quickTrip.tripType,
              creditHours: advanced?.blockHours ?? 0,
              hasLayover: quickTrip.tripType === "LAYOVER",
              layoverHours: quickTrip.layoverHours ?? null,
              reportTime: advanced?.reportTime ?? undefined,
            },
          ]
        : [];

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
    quickTripType: quickTrip?.tripType ?? null,
    quickDestinations: quickTrip?.destinations ?? [],
    quickDate: quickTrip?.date ? new Date(`${quickTrip.date}T00:00:00.000Z`) : null,
    quickLayoverHours: quickTrip?.layoverHours ?? null,
    advancedReportTime: advanced?.reportTime ?? null,
    advancedAircraftTypeCode: advanced?.aircraftTypeCode ?? null,
    advancedBlockHours: advanced?.blockHours ?? null,
    advancedFlightNumber: advanced?.flightNumber ?? null,
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
