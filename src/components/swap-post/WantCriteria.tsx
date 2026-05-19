"use client";

import { useState } from "react";
import type { WantCriteriaData } from "@/types/swapPost";
import type { SwapPostType } from "@/types/swapPost";
import type { WantType } from "@/types/swapPost";
import { WtfDayPicker } from "@/components/swap/WtfDayPicker";
import { WantDestinationsField, ExcludeDestinationsField } from "@/components/swap/WantDestinationsField";

const wantTypeOptions: { value: WantType; label: string; icon: string }[] = [
  { value: "LAYOVER", label: "Layover", icon: "🟢" },
  { value: "ROUND_TRIP", label: "Round Trip", icon: "🔵" },
  { value: "ANY_FLIGHT", label: "Any flight", icon: "✈️" },
  { value: "DAYS_OFF", label: "Days off", icon: "🏖️" },
];

interface WantCriteriaProps {
  postType: SwapPostType;
  criteria: WantCriteriaData;
  onChange: (c: WantCriteriaData) => void;
  desiredDaysOff: number[];
  onDesiredDaysOffChange: (days: number[]) => void;
  scheduledDays: number[];
  month: number;
  year: number;
  onNext: () => void;
  onBack: () => void;
}

export function WantCriteria({
  postType,
  criteria,
  onChange,
  desiredDaysOff,
  onDesiredDaysOffChange,
  scheduledDays,
  month,
  year,
  onNext,
  onBack,
}: WantCriteriaProps) {
  const [attempted, setAttempted] = useState(false);
  const isVacationMode = postType === "VACATION_SWAP";
  const needsOffDaysSelection = criteria.wantType === "DAYS_OFF";
  const showDestinations =
    !needsOffDaysSelection && criteria.wantType !== "ANY_FLIGHT";

  const openAny = criteria.wantOpenToAnyDestination ?? false;
  const wantsOk = needsOffDaysSelection
    ? desiredDaysOff.length > 0
    : criteria.wantType === "ANY_FLIGHT" || openAny || criteria.wantDestinations.length > 0;

  const canProceed =
    criteria.wtfDays.length > 0 &&
    wantsOk &&
    (!needsOffDaysSelection || desiredDaysOff.length > 0);

  function handleNext() {
    setAttempted(true);
    if (canProceed) onNext();
  }

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">What do you want in return?</h2>
      {isVacationMode && (
        <p className="text-sm text-slate-500">Set your preferred vacation replacement window.</p>
      )}

      {/* Return type */}
      <div>
        <div className="flex flex-wrap gap-2">
          {wantTypeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                const next: WantCriteriaData = { ...criteria, wantType: opt.value };
                if (opt.value === "DAYS_OFF") {
                  next.wantOpenToAnyDestination = false;
                  next.wantDestinations = [];
                }
                onChange(next);
              }}
              className={`rounded-lg border-2 px-3 py-2 text-sm transition-colors ${
                (opt.value === "LAYOVER"
                  ? criteria.wantType === "LAYOVER" || criteria.wantType === "LONGER_LAYOVER"
                  : criteria.wantType === opt.value)
                  ? "border-[#2668B0] bg-[#E3EFF9] text-[#2668B0]"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Days off picker */}
      {needsOffDaysSelection && (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
          <p className="text-sm font-medium text-slate-800">Select the days off you want</p>
          <WtfDayPicker
            label="Days off I want"
            selectedDays={desiredDaysOff}
            scheduledDays={[]}
            month={month}
            year={year}
            onChange={onDesiredDaysOffChange}
          />
          {attempted && desiredDaysOff.length === 0 && (
            <p className="text-xs text-rose-600">Choose at least one day you want off.</p>
          )}
          {desiredDaysOff.length > 0 && (
            <p className="text-xs font-medium text-slate-700">
              Days off selected: {[...desiredDaysOff].sort((a, b) => a - b).join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Want destinations */}
      {showDestinations && (
        <div>
          <WantDestinationsField
            label="Where?"
            required
            wantOpenToAnyDestination={openAny}
            wantDestinations={criteria.wantDestinations}
            accentClassName="border-[#2668B0] bg-[#E3EFF9] text-[#2668B0]"
            onChange={({ wantOpenToAnyDestination, wantDestinations }) =>
              onChange({ ...criteria, wantOpenToAnyDestination, wantDestinations })
            }
          />
        </div>
      )}

      {/* Exclude destinations */}
      {showDestinations && (
        <ExcludeDestinationsField
          label="Exclude destinations (optional)"
          wantExclude={criteria.wantExclude}
          accentClassName="border-[#2668B0] bg-[#E3EFF9] text-[#2668B0]"
          onChange={(wantExclude) => onChange({ ...criteria, wantExclude })}
        />
      )}

      {/* Willing to fly days */}
      <div className="space-y-2 rounded-lg border border-[#2668B0]/20 bg-[#2668B0]/5 p-3">
        <WtfDayPicker
          label={
            <>
              Willing to fly <span className="text-rose-600">*</span>
            </>
          }
          selectedDays={criteria.wtfDays}
          scheduledDays={scheduledDays}
          month={month}
          year={year}
          minSelectableDay={new Date().getDate()}
          onChange={(d) => onChange({ ...criteria, wtfDays: d })}
        />
        {attempted && criteria.wtfDays.length === 0 && (
          <p className="text-xs text-rose-600">Choose at least one day you are willing to fly.</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
        <textarea
          value={criteria.notes}
          onChange={(e) => onChange({ ...criteria, notes: e.target.value })}
          placeholder="e.g. any layover is fine, prefer East Asia…"
          className="h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
          rows={3}
        />
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="text-sm text-slate-500 hover:underline">
          ← Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="rounded-lg bg-slate-800 px-6 py-2 text-sm font-medium text-white"
        >
          Preview →
        </button>
      </div>
    </div>
  );
}
