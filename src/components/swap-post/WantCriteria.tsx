"use client";

import type { WantCriteriaData } from "@/types/swapPost";
import type { SwapPostType } from "@/types/swapPost";
import type { WantType } from "@/types/swapPost";
import { DesiredDestinations } from "@/components/swap/DesiredDestinations";
import { WtfDayPicker } from "@/components/swap/WtfDayPicker";

const wantTypeOptions: { value: WantType; label: string; icon: string }[] = [
  { value: "LAYOVER", label: "Any layover", icon: "🟢" },
  { value: "LONGER_LAYOVER", label: "Longer layover", icon: "🟢+" },
  { value: "ROUND_TRIP", label: "Round Trip", icon: "🔵" },
  { value: "ANY_FLIGHT", label: "Any flight", icon: "✈️" },
  { value: "DAYS_OFF", label: "Days off", icon: "🏖️" },
  { value: "ANYTHING", label: "Anything", icon: "🔄" },
];

interface WantCriteriaProps {
  postType: SwapPostType;
  criteria: WantCriteriaData;
  onChange: (c: WantCriteriaData) => void;
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
  scheduledDays,
  month,
  year,
  onNext,
  onBack,
}: WantCriteriaProps) {
  if (postType === "GIVING_AWAY") {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">You want days off</h2>
        <p className="text-sm text-slate-500">
          Someone will take your flight(s). You&apos;ll get the day(s) off.
        </p>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Notes (optional)</label>
          <textarea
            value={criteria.notes}
            onChange={(e) => onChange({ ...criteria, notes: e.target.value })}
            placeholder="Any additional notes..."
            className="h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
            className="rounded-lg bg-slate-800 px-6 py-2 text-sm font-medium text-white"
          >
            Preview →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-900">What do you want in return?</h2>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Type</label>
        <div className="flex flex-wrap gap-2">
          {wantTypeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...criteria, wantType: opt.value })}
              className={`rounded-lg border-2 px-3 py-2 text-sm transition-colors ${
                criteria.wantType === opt.value
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
            className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
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

      <div>
        <WtfDayPicker
          selectedDays={criteria.wtfDays}
          scheduledDays={scheduledDays}
          month={month}
          year={year}
          minSelectableDay={new Date().getDate()}
          onChange={(d) => onChange({ ...criteria, wtfDays: d })}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
        <textarea
          value={criteria.notes}
          onChange={(e) => onChange({ ...criteria, notes: e.target.value })}
          placeholder="e.g. even short layover is fine, no domestic, prefer East Asia..."
          className="h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
          className="rounded-lg bg-slate-800 px-6 py-2 text-sm font-medium text-white"
        >
          Preview →
        </button>
      </div>
    </div>
  );
}
