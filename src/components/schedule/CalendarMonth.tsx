"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarDayData } from "@/utils/calendarBuilder";
import { CalendarDayCell } from "./CalendarDayCell";

interface CalendarMonthProps {
  refreshKey?: number;
}

export function CalendarMonth({ refreshKey }: CalendarMonthProps) {
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [days, setDays] = useState<CalendarDayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/schedule/events?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.days) setDays(json.data.days as CalendarDayData[]);
        else setDays([]);
      })
      .catch(() => setDays([]))
      .finally(() => setLoading(false));
  }, [month, year, refreshKey]);

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month - 1 + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const primaryDays = days.filter((d) => !d.isOverflow);
  const overflowDays = days.filter((d) => d.isOverflow);
  const totalDayCells = primaryDays.length + overflowDays.length;
  const totalCells = Math.ceil((startPad + totalDayCells) / 7) * 7;
  const monthLabel = firstDay.toLocaleString("default", { month: "long", year: "numeric" });

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{monthLabel}</h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading…
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {dayLabels.map((d) => (
              <div
                key={d}
                className="border-r border-slate-200 py-2 text-center text-xs font-medium text-slate-600 last:border-r-0"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: totalCells }, (_, i) => {
              let dayData: CalendarDayData | undefined;
              if (i < startPad) {
                dayData = undefined;
              } else if (i < startPad + primaryDays.length) {
                dayData = primaryDays[i - startPad];
              } else if (i < startPad + totalDayCells) {
                dayData = overflowDays[i - startPad - primaryDays.length];
              }
              if (!dayData) {
                return (
                  <div
                    key={i}
                    className="min-h-[120px] border-r border-b border-slate-100 bg-slate-50/50 last:border-r-0"
                  />
                );
              }
              return (
                <CalendarDayCell
                  key={i}
                  day={dayData}
                  onTripClick={(tripNumber) => {
                    // Optional: navigate or open trip detail
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
