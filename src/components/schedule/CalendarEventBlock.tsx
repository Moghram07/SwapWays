"use client";

import type { CalendarTripEvent } from "@/types/calendar";
import { EventContent } from "./EventContent";

interface CalendarEventBlockProps {
  event: CalendarTripEvent;
  onClick?: () => void;
}

function getAccentColor(event: CalendarTripEvent): string {
  switch (event.tripType) {
    case "LAYOVER":
      return "#3BA34A";
    case "TURNAROUND":
      return "#2668B0";
    case "MULTI_STOP":
      return "#d97706";
    default:
      return "#6b7280";
  }
}

function getBlockStyles(event: CalendarTripEvent): string {
  const base = `${event.typeInfo.bgColor} ${event.typeInfo.textColor}`;
  const isLayoverDay = event.dayRole === "LAYOVER_DAY";
  const borderClass = "border-l-[3px]";
  if (isLayoverDay) {
    return `${base} ${borderClass} border-dashed opacity-80`;
  }
  return `${base} ${borderClass}`;
}

export function CalendarEventBlock({ event, onClick }: CalendarEventBlockProps) {
  const accentColor = getAccentColor(event);
  const blockStyles = getBlockStyles(event);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`rounded-md px-2 py-1.5 cursor-pointer text-[11px] leading-tight transition-opacity hover:opacity-90 ${blockStyles}`}
      style={{ borderLeftColor: accentColor }}
    >
      <EventContent event={event} />
    </div>
  );
}
