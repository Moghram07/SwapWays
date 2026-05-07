"use client";

import type { ReactNode } from "react";

interface WtfDayPickerProps {
  selectedDays: number[];
  scheduledDays: number[];
  month: number; // 1-12
  year: number;
  onChange: (days: number[]) => void;
  /** When set, only days before this (in the month) are disabled; all from this day onward are selectable. */
  minSelectableDay?: number;
  /** Override the label (default: "Willing to fly days"). Set to empty string to hide. */
  label?: ReactNode;
}

export function WtfDayPicker({
  selectedDays,
  scheduledDays,
  month,
  year,
  onChange,
  minSelectableDay,
  label: labelProp,
}: WtfDayPickerProps) {
  const label = labelProp !== undefined ? labelProp : "Willing to fly days";
  const daysInMonth = new Date(year, month, 0).getDate();

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const isPastDay = (day: number) =>
    new Date(year, month - 1, day).setHours(0, 0, 0, 0) < todayStart;
  const isDayDisabled = (day: number) =>
    minSelectableDay != null ? isPastDay(day) : false;

  function toggleDay(day: number) {
    if (isDayDisabled(day)) return;
    if (selectedDays.includes(day)) {
      onChange(selectedDays.filter((d) => d !== day));
    } else {
      onChange([...selectedDays, day].sort((a, b) => a - b));
    }
  }

  function selectAllDaysOff() {
    if (minSelectableDay != null) {
      const isCurrentMonth =
        year === new Date().getFullYear() && month === new Date().getMonth() + 1;
      const from = isCurrentMonth ? minSelectableDay : 1;
      const fromToday: number[] = [];
      for (let d = from; d <= daysInMonth; d++) fromToday.push(d);
      onChange(fromToday);
    } else {
      const off: number[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        if (!scheduledDays.includes(d)) off.push(d);
      }
      onChange(off);
    }
  }

  return (
    <div>
      {label !== "" && (
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        <button
          type="button"
          onClick={selectAllDaysOff}
          className="text-xs hover:underline"
          style={{ color: "var(--primary-cta)" }}
        >
          {minSelectableDay != null ? "Select from today" : "Select all days off"}
        </button>
      </div>
      )}
      {label !== "" && (
        <p className="mb-2 text-xs text-gray-500">
          {minSelectableDay != null
            ? "Select days you are available to fly. Greyed-out days are in the past."
            : "Select your days off when you are available to fly instead. Blue days show flights and green days show off days."}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const isDisabled = isDayDisabled(day);
          const hasFlight = scheduledDays.includes(day);
          const isPast = isPastDay(day);
          const isSelected = selectedDays.includes(day);
          const baseClasses =
            "h-9 w-9 rounded-lg text-sm font-medium transition-colors";
          const disabledClasses = "cursor-not-allowed bg-gray-100 text-gray-400";
          const selectedClasses =
            "border-2 border-[var(--primary-cta)] bg-[var(--primary-cta)] text-white ring-2 ring-offset-1 ring-[var(--primary-cta)]";
          const neutralClasses =
            "border border-gray-200 bg-white text-gray-700 hover:border-[var(--primary-cta)]";
          const flightDayClasses =
            "border border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400";
          const offDayClasses =
            "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400";
          return (
            <button
              key={day}
              type="button"
              disabled={isDisabled}
              onClick={() => toggleDay(day)}
              className={`${baseClasses} ${
                isDisabled
                  ? disabledClasses
                  : isSelected
                    ? selectedClasses
                    : minSelectableDay == null && isPast
                      ? neutralClasses
                      : hasFlight
                      ? flightDayClasses
                      : offDayClasses
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-gray-500">
        {selectedDays.length} day{selectedDays.length === 1 ? "" : "s"} selected
        <span className="ml-3">·</span>
        <span className="ml-3 text-blue-600">Blue = flight day</span>
        <span className="ml-3 text-emerald-600">Green = off day</span>
      </p>
    </div>
  );
}

