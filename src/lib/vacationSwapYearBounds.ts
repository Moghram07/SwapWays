/** Calendar years allowed for new vacation swap posts: this year and next. */

export function getVacationSwapYearRange(now = new Date()): { min: number; max: number } {
  const y = now.getFullYear();
  return { min: y, max: y + 1 };
}

/**
 * True if `year` is allowed for a vacation swap post.
 * New posts: must be in [current calendar year, next year].
 * Edits: unchanged stored year may fall outside that window (legacy rows).
 */
export function isAllowedVacationSwapYear(
  year: number,
  opts?: { existingYear?: number | null; now?: Date }
): boolean {
  const { min, max } = getVacationSwapYearRange(opts?.now);
  if (year >= min && year <= max) return true;
  if (opts?.existingYear != null && year === opts.existingYear) return true;
  return false;
}
