"use client";

import { useMemo } from "react";
import { getAllAirports } from "@/utils/airportNames";
import type { QuickPostAdvancedData, QuickPostTripData, WantCriteriaData } from "@/types/swapPost";
import { DesiredDestinations } from "@/components/swap/DesiredDestinations";
import { WtfDayPicker } from "@/components/swap/WtfDayPicker";

interface QuickPostFormProps {
  quickTrip: QuickPostTripData;
  advanced: QuickPostAdvancedData;
  wantCriteria: WantCriteriaData;
  month: number;
  year: number;
  scheduledDays: number[];
  onQuickTripChange: (value: QuickPostTripData) => void;
  onAdvancedChange: (value: QuickPostAdvancedData) => void;
  onWantCriteriaChange: (value: WantCriteriaData) => void;
  onBack: () => void;
  onNext: () => void;
}

const tripTypeOptions: Array<{ value: QuickPostTripData["tripType"]; label: string }> = [
  { value: "LAYOVER", label: "Layover" },
  { value: "TURNAROUND", label: "Round trip" },
  { value: "MULTI_STOP", label: "Multi-stop" },
];

const wantTypeOptions: Array<{ value: WantCriteriaData["wantType"]; label: string }> = [
  { value: "LAYOVER", label: "Any layover" },
  { value: "ROUND_TRIP", label: "Round trip" },
  { value: "ANYTHING", label: "Anything" },
  { value: "DAYS_OFF", label: "Days off" },
];

function normalizeCsvCodes(value: string): string[] {
  return value
    .split(",")
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 8);
}

export function QuickPostForm({
  quickTrip,
  advanced,
  wantCriteria,
  month,
  year,
  scheduledDays,
  onQuickTripChange,
  onAdvancedChange,
  onWantCriteriaChange,
  onBack,
  onNext,
}: QuickPostFormProps) {
  const airports = useMemo(() => getAllAirports(), []);
  const canProceed =
    quickTrip.date &&
    quickTrip.destinations.length > 0 &&
    (quickTrip.tripType !== "LAYOVER" || quickTrip.layoverHours == null || quickTrip.layoverHours >= 0);

  const multiCodes = quickTrip.destinations.join(", ");

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-900">Quick Post (15 seconds)</h2>
      <p className="text-sm text-slate-500">
        Post like WhatsApp: destination, duration, date, and what you want in return.
      </p>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Trip type</label>
        <div className="flex flex-wrap gap-2">
          {tripTypeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onQuickTripChange({ ...quickTrip, tripType: opt.value })}
              className={`rounded-lg border px-3 py-2 text-sm ${
                quickTrip.tripType === opt.value
                  ? "border-[#2668B0] bg-[#E3EFF9] text-[#2668B0]"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {quickTrip.tripType === "MULTI_STOP" ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Destinations (comma-separated)</label>
          <input
            type="text"
            value={multiCodes}
            onChange={(e) =>
              onQuickTripChange({
                ...quickTrip,
                destinations: normalizeCsvCodes(e.target.value),
              })
            }
            placeholder="e.g. JED, DAC, LHR"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Destination</label>
          <select
            value={quickTrip.destinations[0] ?? ""}
            onChange={(e) =>
              onQuickTripChange({
                ...quickTrip,
                destinations: e.target.value ? [e.target.value] : [],
              })
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Select destination</option>
            {airports.map((a) => (
              <option key={a.code} value={a.code}>
                {a.city} ({a.code})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
          <input
            type="date"
            value={quickTrip.date}
            onChange={(e) => onQuickTripChange({ ...quickTrip, date: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        {quickTrip.tripType === "LAYOVER" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Duration (hours)</label>
            <input
              type="number"
              min={0}
              step={1}
              value={quickTrip.layoverHours ?? ""}
              onChange={(e) =>
                onQuickTripChange({
                  ...quickTrip,
                  layoverHours: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="e.g. 32"
            />
          </div>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Want type</label>
        <div className="flex flex-wrap gap-2">
          {wantTypeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onWantCriteriaChange({ ...wantCriteria, wantType: opt.value })}
              className={`rounded-lg border px-3 py-2 text-sm ${
                wantCriteria.wantType === opt.value
                  ? "border-[#2668B0] bg-[#E3EFF9] text-[#2668B0]"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Want destinations (optional)</label>
        <DesiredDestinations
          selected={wantCriteria.wantDestinations}
          onChange={(d) => onWantCriteriaChange({ ...wantCriteria, wantDestinations: d })}
          hideLabel
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Exclude destinations (optional)</label>
        <DesiredDestinations
          selected={wantCriteria.wantExclude}
          onChange={(d) => onWantCriteriaChange({ ...wantCriteria, wantExclude: d })}
          hideLabel
        />
      </div>

      <div className="rounded-lg border border-slate-200 p-3">
        <WtfDayPicker
          label="WTF days (optional)"
          selectedDays={wantCriteria.wtfDays}
          scheduledDays={scheduledDays}
          month={month}
          year={year}
          onChange={(days) => onWantCriteriaChange({ ...wantCriteria, wtfDays: days })}
        />
      </div>

      <details className="rounded-lg border border-slate-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-800">More details (optional)</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            type="text"
            value={advanced.reportTime ?? ""}
            onChange={(e) => onAdvancedChange({ ...advanced, reportTime: e.target.value || null })}
            placeholder="Report time (e.g. 08.30Z)"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={advanced.aircraftTypeCode ?? ""}
            onChange={(e) => onAdvancedChange({ ...advanced, aircraftTypeCode: e.target.value || null })}
            placeholder="Aircraft type (e.g. 32N)"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={0}
            step={0.1}
            value={advanced.blockHours ?? ""}
            onChange={(e) =>
              onAdvancedChange({
                ...advanced,
                blockHours: e.target.value ? Number(e.target.value) : null,
              })
            }
            placeholder="Block hours"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={advanced.flightNumber ?? ""}
            onChange={(e) => onAdvancedChange({ ...advanced, flightNumber: e.target.value || null })}
            placeholder="Flight number"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </details>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Notes (optional)</label>
        <textarea
          value={wantCriteria.notes}
          onChange={(e) => onWantCriteriaChange({ ...wantCriteria, notes: e.target.value })}
          placeholder="Any extra note..."
          rows={3}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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

