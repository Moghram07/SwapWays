export function formatDisplayDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

import type { LocalDateParts } from "@/utils/airportTimezones";

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Format a local date (from getLocalDateFromZulu) for display.
 * Month is 0-indexed in LocalDateParts.
 */
export function formatLocalDate(
  localDate: LocalDateParts,
  options?: { weekday?: boolean; year?: boolean }
): string {
  const { year, month, day } = localDate;
  const dateOnly = new Date(Date.UTC(year, month, day));
  const weekday = options?.weekday
    ? WEEKDAY_SHORT[dateOnly.getUTCDay()] + ", "
    : "";
  const yearSuffix = options?.year !== false ? ` ${year}` : "";
  return `${weekday}${MONTH_SHORT[month]} ${day}${yearSuffix}`;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getDayOfMonth(date: Date): number {
  return date.getDate();
}

export function isDateInRange(date: Date, from: Date, to: Date): boolean {
  const t = date.getTime();
  return t >= from.getTime() && t <= to.getTime();
}

/** Relative time for list items (e.g. "2h", "Yesterday"). */
export function formatTimeAgo(date: Date): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  if (diff < 86400000 * 2) return "Yesterday";
  if (diff < 604800000) return Math.floor(diff / 86400000) + "d";
  if (sameYear) return d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}
