/**
 * Schedule times use HH.MM format (hours and minutes), NOT decimal hours.
 * "02.20" = 2 hours 20 minutes = 2.333 decimal hours.
 */

export function scheduleTimeToDecimalHours(timeStr: string): number {
  const cleaned = (timeStr ?? "").replace("Z", "").trim();
  const parts = cleaned.split(".");
  const hours = parseInt(parts[0] ?? "0", 10) || 0;
  const minutes = parseInt(parts[1] ?? "0", 10) || 0;
  return hours + minutes / 60;
}

export function scheduleTimeToMinutes(timeStr: string): number {
  const decimal = scheduleTimeToDecimalHours(timeStr);
  return Math.round(decimal * 60);
}

export function decimalHoursToDisplayTime(decimal: number): string {
  if (!Number.isFinite(decimal)) return "00:00";
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/** Format credit hours as "10h 30m" for scannable display. */
export function creditHoursToHumanReadable(decimal: number): string {
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function zuluTimeToDisplay(timeStr: string): string {
  return (timeStr ?? "").replace(".", ":").replace("Z", " UTC");
}

/** Format schedule time "02.45Z" as "02:45Z" for display. */
export function formatZuluTime(timeStr: string): string {
  const clean = (timeStr ?? "").replace("Z", "").trim();
  return clean.replace(".", ":") + (timeStr?.endsWith("Z") ? "Z" : "Z");
}
