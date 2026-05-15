"use client";

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
  const isVacationMode = postType === "VACATION_SWAP";
  const needsOffDaysSelection = criteria.wantType === "DAYS_OFF";

  const openAny = criteria.wantOpenToAnyDestination ?? false;
  const wantsOk =
    needsOffDaysSelection
      ? desiredDaysOff.length > 0
      : openAny || criteria.wantDestinations.length > 0;

  const canProceed =
    criteria.wtfDays.length > 0 && wantsOk && (!needsOffDaysSelection || desiredDaysOff.length > 0);

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-900">What do you want in return?</h2>
      {isVacationMode && (
        <p className="text-sm text-slate-500">Set your preferred vacation replacement window.</p>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Return trip type</label>
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

      {(criteria.wantType === "LAYOVER" || criteria.wantType === "LONGER_LAYOVER") && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Layover duration (hours)
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={criteria.wantMinLayover ?? ""}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
              onChange({ ...criteria, wantMinLayover: raw ? Number(raw) : null });
            }}
            placeholder="e.g. 24"
            className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>
      )}

      {needsOffDaysSelection && (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
          <p className="text-sm font-medium text-slate-800">
            Select the days off you want <span className="text-rose-600">*</span>
          </p>
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

      {!needsOffDaysSelection && (
        <>
          <div>
            <WantDestinationsField
              label="Want destinations"
              description="Pick specific airports or Anything."
              required
              wantOpenToAnyDestination={openAny}
              wantDestinations={criteria.wantDestinations}
              accentClassName="border-[#2668B0] bg-[#E3EFF9] text-[#2668B0]"
              onChange={({ wantOpenToAnyDestination, wantDestinations }) =>
                onChange({ ...criteria, wantOpenToAnyDestination, wantDestinations })
              }
            />
            {!openAny && criteria.wantDestinations.length === 0 && (
              <p className="mt-1 text-xs text-rose-600">Choose at least one destination or Anything.</p>
            )}
          </div>

          {(criteria.wantType === "LAYOVER" || criteria.wantType === "LONGER_LAYOVER") && (
            <p className="mt-1 text-xs text-slate-500">
              Leave cities blank to accept any layover destination, or add specific cities you prefer.
            </p>
          )}

          <ExcludeDestinationsField
            label="Exclude destinations (optional)"
            wantExclude={criteria.wantExclude}
            accentClassName="border-[#2668B0] bg-[#E3EFF9] text-[#2668B0]"
            onChange={(wantExclude) => onChange({ ...criteria, wantExclude })}
          />
        </>
      )}

      <div className="space-y-2 rounded-lg border border-[#2668B0]/20 bg-[#2668B0]/5 p-3">
        <WtfDayPicker
          label={
            <>
              I am willing to fly on <span className="text-rose-600">*</span>
            </>
          }
          selectedDays={criteria.wtfDays}
          scheduledDays={scheduledDays}
          month={month}
          year={year}
          minSelectableDay={new Date().getDate()}
          onChange={(d) => onChange({ ...criteria, wtfDays: d })}
        />
        {criteria.wtfDays.length === 0 && (
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
