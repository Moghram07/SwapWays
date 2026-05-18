/**
 * Detects match_cache.reasons[] from the pre–Fit Score × Date Multiplier engine so we can
 * recompute instead of serving stale scores.
 *
 * Two checks:
 * 1. Explicit old-engine reason strings (blended-formula + one-sided scorer).
 * 2. Whitelist: if none of the reasons look like new-engine output, treat the whole entry as stale.
 */

const NEW_ENGINE_REASON_MARKERS = [
  "They offer a destination you want",
  "You are open to their destination",
  "You offer a destination they want",
  "They are flexible on destination",
  "Same trip type",
  "Open to any trip type",
  "Flexible trip preferences",
  "Dates don't align with either side's willing-to-fly days",
  "Partial date alignment",
  // These two appear in both engines but only the new engine produces them alongside the markers above
  "Their trip date matches your willing-to-fly days",
  "Your offered date matches their willing-to-fly days",
];

function isNewEngineEntry(reasons: string[]): boolean {
  return reasons.some((r) =>
    NEW_ENGINE_REASON_MARKERS.some((m) => r.trim().startsWith(m))
  );
}

export function matchCacheNeedsRecompute(reasons: string[] | null | undefined): boolean {
  if (!reasons?.length) return false;

  // Any entry with exclusively new-engine reasons is trusted
  if (isNewEngineEntry(reasons)) return false;

  // Everything else is from the old blended scorer — recompute
  return true;
}
