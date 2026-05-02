"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface VacationSwapFieldsProps {
  vacationYear: number | "";
  vacationMonth: number | "";
  vacationStartDay: number | "";
  vacationEndDay: number | "";
  desiredMonths: number[];
  onVacationYearChange: (v: number | "") => void;
  onVacationMonthChange: (v: number | "") => void;
  onVacationStartDayChange: (v: number | "") => void;
  onVacationEndDayChange: (v: number | "") => void;
  onDesiredMonthsChange: (months: number[]) => void;
  /**
   * When editing a legacy post, the saved year may be before the allowed window.
   * Include it in the dropdown so the control stays valid until the user picks a new year.
   */
  includeLegacyVacationYear?: number;
}

export function VacationSwapFields(props: VacationSwapFieldsProps) {
  const nowYear = new Date().getFullYear();
  const baseYears = [nowYear, nowYear + 1];
  const legacy = props.includeLegacyVacationYear;
  const yearOptions =
    legacy != null &&
    Number.isInteger(legacy) &&
    legacy >= 1900 &&
    legacy <= 2100 &&
    !baseYears.includes(legacy)
      ? [...baseYears, legacy].sort((a, b) => a - b)
      : baseYears;
  const toggleDesiredMonth = (month: number) => {
    const next = props.desiredMonths.includes(month)
      ? props.desiredMonths.filter((m) => m !== month)
      : [...props.desiredMonths, month].sort((a, b) => a - b);
    props.onDesiredMonthsChange(next);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Vacation month (required)</Label>
          <select
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
            value={props.vacationMonth === "" ? "" : props.vacationMonth}
            onChange={(e) => {
              const v = e.target.value;
              props.onVacationMonthChange(v === "" ? "" : Number(v));
            }}
          >
            <option value="">Select month</option>
            {MONTH_NAMES.map((name, i) => (
              <option key={i} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Year (required)</Label>
          <select
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
            value={props.vacationYear === "" ? "" : props.vacationYear}
            onChange={(e) => {
              const v = e.target.value;
              props.onVacationYearChange(v === "" ? "" : Number(v));
            }}
          >
            <option value="">Select year</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-600">Specific block or dates (optional)</Label>
        <p className="text-xs text-slate-500">
          Crew usually swap by block (full month, 1 or 2 weeks). Same number of days is often required.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs font-normal text-slate-500">Start day (1–31)</Label>
            <Input
              type="number"
              min={1}
              max={31}
              placeholder="e.g. 10"
              value={props.vacationStartDay === "" ? "" : props.vacationStartDay}
              onChange={(e) => {
                const v = e.target.value;
                props.onVacationStartDayChange(v === "" ? "" : Math.max(1, Math.min(31, Number(v) || 0)));
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-normal text-slate-500">End day (1–31)</Label>
            <Input
              type="number"
              min={1}
              max={31}
              placeholder="e.g. 23"
              value={props.vacationEndDay === "" ? "" : props.vacationEndDay}
              onChange={(e) => {
                const v = e.target.value;
                props.onVacationEndDayChange(v === "" ? "" : Math.max(1, Math.min(31, Number(v) || 0)));
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Looking for (required) — select at least one month</Label>
        <p className="text-xs text-slate-500">
          Listing multiple months increases your chance of finding a match.
        </p>
        <div className="flex flex-wrap gap-2">
          {MONTH_NAMES.map((name, i) => {
            const month = i + 1;
            const checked = props.desiredMonths.includes(month);
            return (
              <label
                key={month}
                className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-sm ${
                  checked
                    ? "border-[#2668B0] bg-[#2668B0]/10 text-[#2668B0]"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => toggleDesiredMonth(month)}
                />
                {name}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
