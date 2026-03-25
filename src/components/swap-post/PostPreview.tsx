"use client";

import type { SwapPostType } from "@/types/swapPost";
import type { WantCriteriaData } from "@/types/swapPost";
import type { TripOption } from "./TripSelector";
import { SwapPostTradeBoardCard } from "./TradeBoardCard";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface PostPreviewProps {
  postType: SwapPostType;
  selectedTrips: TripOption[];
  selectedDaysOff: number[];
  wantCriteria: WantCriteriaData;
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
  userDisplay,
  vacationYear,
  vacationMonth,
  vacationStartDay,
  vacationEndDay,
  desiredVacationMonths = [],
  onPost,
  onBack,
}: PostPreviewProps) {
  const offeredTrips = selectedTrips.map((t) => ({
    flightNumber: t.legs[0]?.flightNumber ?? "",
    destination: t.legs[t.legs.length - 1]?.arrivalAirport ?? "",
    departureDate: t.startDate,
    tripType: t.tripType,
    creditHours: t.creditHours,
    hasLayover: t.layovers.length > 0,
    layoverHours: t.layovers[0]?.durationDecimal ?? null,
  }));

  const post = {
    postType,
    offeredTrips,
    offeringDaysOff: postType === "OFFERING_DAYS_OFF",
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
