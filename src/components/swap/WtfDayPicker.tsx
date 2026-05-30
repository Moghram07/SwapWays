"use client";

import { useState } from "react";
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
  /** When provided, called to get scheduled days when the user navigates to a different month. */
  getScheduledDaysForMonth?: (month: number, year: number) => number[];
}

export function WtfDayPicker({
  selectedDays,
  scheduledDays: initialScheduledDays,
  month,
  year,
  onChange,
  minSelectableDay,
  label: labelProp,
  getScheduledDaysForMonth,
}: WtfDayPickerProps) {
  const label = labelProp !== undefined ? labelProp : "Willing to fly days";

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const [displayMonth, setDisplayMonth] = useState(month);
  const [displayYear, setDisplayYear] = useState(year);
  const [navigatedScheduledDays, setNavigatedScheduledDays] = useState<number[] | null>(null);

  const scheduledDays =
    navigatedScheduledDays !== null ? navigatedScheduledDays : initialScheduledDays;

  const isOnCurrentMonth =
    displayMonth === currentMonth && displayYear === currentYear;

  const nextMonthNum = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear;

  function selectMonth(m: number, y: number) {
    setDisplayMonth(m);
    setDisplayYear(y);
    if (m === currentMonth && y === currentYear) {
      setNavigatedScheduledDays(null);
    } else if (getScheduledDaysForMonth) {
      setNavigatedScheduledDays(getScheduledDaysForMonth(m, y));
    } else {
      setNavigatedScheduledDays([]);
    }
  }

  const daysInMonth = new Date(displayYear, displayMonth, 0).getDate();

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const isPastDay = (day: number) =>
    new Date(displayYear, displayMonth - 1, day).setHours(0, 0, 0, 0) < todayStart;
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
      const fromDay = isOnCurrentMonth ? minSelectableDay : 1;
      const fromToday: number[] = [];
      for (let d = fromDay; d <= daysInMonth; d++) fromToday.push(d);
      onChange(fromToday);
    } else {
      const off: number[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        if (!scheduledDays.includes(d)) off.push(d);
      }
      onChange(off);
    }
  }

  function monthLabel(m: number, y: number) {
    return new Date(y, m - 1).toLocaleString("default", { month: "long", year: "numeric" });
  }

  const selectAllLabel =
    minSelectableDay != null
      ? isOnCurrentMonth
        ? "Select from today"
        : "Select all"
      : "Select all days off";

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
            {selectAllLabel}
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

      {/* Month toggle */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => selectMonth(currentMonth, currentYear)}
          className={`rounded-lg border-2 py-2 text-sm font-medium transition-colors ${
            isOnCurrentMonth
              ? "border-[var(--primary-cta)] bg-[var(--primary-cta)] text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          {monthLabel(currentMonth, currentYear)}
        </button>
        <button
          type="button"
          onClick={() => selectMonth(nextMonthNum, nextMonthYear)}
          className={`rounded-lg border-2 py-2 text-sm font-medium transition-colors ${
            !isOnCurrentMonth
              ? "border-[var(--primary-cta)] bg-[var(--primary-cta)] text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          {monthLabel(nextMonthNum, nextMonthYear)}
        </button>
      </div>

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
        <span className="text-blue-600">Blue = flight day</span>
        <span className="ml-3 text-emerald-600">Green = off day</span>
      </p>
    </div>
  );
}
