/**
 * Detects match_cache.reasons[] from the pre–mutual-engine scorer so we can recompute
 * instead of showing confusing legacy strings (e.g. "Has 3 layover trip(s)" = viewer's schedule, not the swap).
 */
export function matchCacheNeedsRecompute(reasons: string[] | null | undefined): boolean {
  if (!reasons?.length) return false;
  return reasons.some((raw) => {
    const r = raw.trim();
    if (/^Has \d+ layover trip\(s\)$/i.test(r)) return true;
    if (/^Has \d+ turnaround trip\(s\)$/i.test(r)) return true;
    if (r === "No date constraint - flexible") return true;
    if (r === "Has non-excluded destinations") return true;
    return false;
  });
}
