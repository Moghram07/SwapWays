"use client";

import type { CalendarDayData } from "@/types/calendar";
import { CalendarEventBlock } from "./CalendarEventBlock";

interface CalendarDayCellProps {
  day: CalendarDayData;
  onTripClick?: (tripNumber: string) => void;
}

function getMonthShort(month: number): string {
  return [
    "",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][month] ?? "";
}

export function CalendarDayCell({ day, onTripClick }: CalendarDayCellProps) {
  const today = new Date();
  const isToday =
    day.year === today.getFullYear() &&
    day.month === today.getMonth() + 1 &&
    day.dayOfMonth === today.getDate();

  return (
    <div
      className={`min-h-[120px] p-1.5 border-b border-r border-gray-100 ${
        day.isOverflow ? "bg-gray-50/50" : "bg-white"
      } ${isToday ? "ring-2 ring-inset ring-[#2668B0]/30" : ""}`}
    >
      <div className="flex items-baseline gap-1 mb-1">
        <span
          className={`text-sm font-medium ${
            isToday
              ? "text-[#2668B0]"
              : day.isOverflow
                ? "text-gray-500"
                : "text-gray-700"
          }`}
        >
          {day.dayOfMonth}
        </span>
        {day.isOverflow && (
          <span className="text-[10px] text-gray-500">
            {getMonthShort(day.month)}
          </span>
        )}
      </div>

      <div className="space-y-1">
        {day.events.map((event, i) => (
          <CalendarEventBlock
            key={`${event.tripNumber}-${i}`}
            event={event}
            onClick={() => onTripClick?.(event.tripNumber)}
          />
        ))}
      </div>
    </div>
  );
}
