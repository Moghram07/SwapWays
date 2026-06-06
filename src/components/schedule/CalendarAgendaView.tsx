"use client";

import type { CalendarDayData } from "@/types/calendar";
import { CalendarEventBlock } from "./CalendarEventBlock";

interface CalendarAgendaViewProps {
  days: CalendarDayData[];
  month: number;
}

function getMonthShort(month: number): string {
  return ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month] ?? "";
}

function getWeekdayLabel(weekday: string): string {
  switch (weekday) {
    case "SU":
      return "Sun";
    case "MO":
      return "Mon";
    case "TU":
      return "Tue";
    case "WE":
      return "Wed";
    case "TH":
      return "Thu";
    case "FR":
      return "Fri";
    default:
      return "Sat";
  }
}

export function CalendarAgendaView({ days, month }: CalendarAgendaViewProps) {
  const relevantDays = days.filter((d) => d.events.length > 0);

  if (relevantDays.length === 0) {
    return <div className="py-12 text-center text-faint">No flights scheduled for this month.</div>;
  }

  return (
    <div className="space-y-3">
      {relevantDays.map((day) => (
        <div
          key={`${day.year}-${day.month}-${day.dayOfMonth}`}
          className="rounded-xl border border-line bg-surface p-3"
        >
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-content">{day.dayOfMonth}</span>
            <span className="text-sm text-muted">{getWeekdayLabel(day.weekday)}</span>
            {day.month !== month && <span className="text-xs text-faint">{getMonthShort(day.month)}</span>}
          </div>

          <div className="space-y-2">
            {day.events.map((event, i) => (
              <CalendarEventBlock key={`${event.tripNumber}-${i}`} event={event} variant="agenda" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
