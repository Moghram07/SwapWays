/** UTC calendar helpers for swap matching (avoid raw day-of-month compares across months). */

export function dateKeyUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isSameDayUTC(a: Date, b: Date): boolean {
  return dateKeyUTC(a) === dateKeyUTC(b);
}

/** Absolute difference in calendar days using UTC date components only. */
export function calendarDaysApartUTC(a: Date, b: Date): number {
  const ta = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const tb = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round(Math.abs(ta - tb) / 86400000);
}

export function expandDayOfMonthToKeysInMonth(
  year: number,
  month1Based: number,
  dayInts: number[]
): string[] {
  const keys: string[] = [];
  for (const dom of dayInts) {
    if (dom < 1 || dom > 31) continue;
    const d = new Date(Date.UTC(year, month1Based - 1, dom));
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month1Based - 1 || d.getUTCDate() !== dom) continue;
    keys.push(dateKeyUTC(d));
  }
  return keys;
}
