"use client";

import type { WantCriteriaData } from "@/types/swapPost";
import type { SwapPostType } from "@/types/swapPost";
import type { WantType } from "@/types/swapPost";
import { DesiredDestinations } from "@/components/swap/DesiredDestinations";
import { WtfDayPicker } from "@/components/swap/WtfDayPicker";

const wantTypeOptions: { value: WantType; label: string; icon: string }[] = [
  { value: "LAYOVER", label: "Layover", icon: "🟢" },
  { value: "ROUND_TRIP", label: "Round Trip", icon: "🔵" },
  { value: "ANY_FLIGHT", label: "Any flight", icon: "✈️" },
  { value: "DAYS_OFF", label: "Days off", icon: "🏖️" },
  { value: "ANYTHING", label: "Anything", icon: "🔄" },
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
  const isVacationMode = postType === "VACATION_SWAP";
  const needsOffDaysSelection = criteria.wantType === "DAYS_OFF";
  const canProceed =
    !needsOffDaysSelection || (desiredDaysOff.length > 0 && criteria.wtfDays.length > 0);

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-900">What do you want in return?</h2>
      {isVacationMode && (
        <p className="text-sm text-slate-500">Set your preferred vacation replacement window.</p>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Type</label>
        <div className="flex flex-wrap gap-2">
          {wantTypeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...criteria, wantType: opt.value })}
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

      {(criteria.wantType === "LAYOVER" || criteria.wantType === "LONGER_LAYOVER") && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Minimum layover duration (hours)
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={criteria.wantMinLayover ?? ""}
            onChange={(e) =>
              onChange({ ...criteria, wantMinLayover: e.target.value ? Number(e.target.value) : null })
            }
            placeholder="e.g. 24"
            className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>
      )}

      {needsOffDaysSelection && (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
          <p className="text-sm font-medium text-slate-800">Select the days off you want (required)</p>
          <WtfDayPicker
            label="Days off I want"
            selectedDays={desiredDaysOff}
            scheduledDays={[]}
            month={month}
            year={year}
            onChange={onDesiredDaysOffChange}
          />
          {desiredDaysOff.length === 0 && (
            <p className="text-xs text-rose-600">Choose at least one day you want off.</p>
          )}
          {desiredDaysOff.length > 0 && (
            <p className="text-xs font-medium text-slate-700">
              Days off selected: {[...desiredDaysOff].sort((a, b) => a - b).join(", ")}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={criteria.wantEqualHours}
            onChange={(e) => onChange({ ...criteria, wantEqualHours: e.target.checked })}
            className="rounded border-slate-300"
          />
          Equal block hours
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={criteria.wantSameDate}
            onChange={(e) => onChange({ ...criteria, wantSameDate: e.target.checked })}
            className="rounded border-slate-300"
          />
          Same date
        </label>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Preferred destinations (optional)
        </label>
        <DesiredDestinations
          selected={criteria.wantDestinations}
          onChange={(d) => onChange({ ...criteria, wantDestinations: d })}
          hideLabel
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Exclude destinations</label>
        <DesiredDestinations
          selected={criteria.wantExclude}
          onChange={(d) => onChange({ ...criteria, wantExclude: d })}
          hideLabel
        />
      </div>

      <div className="space-y-2 rounded-lg border border-[#2668B0]/20 bg-[#2668B0]/5 p-3">
        <WtfDayPicker
          label="I am willing to fly on"
          selectedDays={criteria.wtfDays}
          scheduledDays={scheduledDays}
          month={month}
          year={year}
          minSelectableDay={new Date().getDate()}
          onChange={(d) => onChange({ ...criteria, wtfDays: d })}
        />
        {needsOffDaysSelection && criteria.wtfDays.length === 0 && (
          <p className="text-xs text-rose-600">Choose at least one day you are willing to fly.</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
        <textarea
          value={criteria.notes}
          onChange={(e) => onChange({ ...criteria, notes: e.target.value })}
          placeholder="e.g. even short layover is fine, no domestic, prefer East Asia..."
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
          onClick={onNext}
          disabled={!canProceed}
          className="rounded-lg bg-slate-800 px-6 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Preview →
        </button>
      </div>
    </div>
  );
}
