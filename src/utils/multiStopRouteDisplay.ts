/**
 * Multi-stop route lines as leg chains, e.g. "JED → GIZ + GIZ → JED"
 * (no redundant "GIZ → GIZ" or "JED → JED" from repeated airport codes).
 */

/** Drop consecutive duplicate IATA codes (after trim + uppercase). */
export function collapseConsecutiveAirports(codes: string[]): string[] {
  const normalized = codes.map((c) => c.trim().toUpperCase()).filter(Boolean);
  const out: string[] = [];
  for (const c of normalized) {
    if (out.length === 0 || out[out.length - 1] !== c) out.push(c);
  }
  return out;
}

/**
 * Ordered airports visited along schedule legs (dep continuity), without station stutters.
 */
export function multiStopTouchpointsFromLegs(
  legs: Array<{ departureAirport?: string | null; arrivalAirport?: string | null }> | undefined | null
): string[] | null {
  if (!legs || legs.length === 0) return null;
  const points: string[] = [];
  for (const leg of legs) {
    const dep = leg.departureAirport?.trim().toUpperCase();
    const arr = leg.arrivalAirport?.trim().toUpperCase();
    if (!dep || !arr) return null;
    if (points.length === 0) points.push(dep);
    else if (dep !== points[points.length - 1]) points.push(dep);
    if (arr !== points[points.length - 1]) points.push(arr);
  }
  return points;
}

/** Pairwise legs as display strings, e.g. ["Jeddah (JED) → Jazan (GIZ)", ...]. */
export function multiStopRouteSegmentsFromCodes(
  codes: string[],
  formatAirport: (code: string) => string = (c) => c.trim().toUpperCase()
): string[] {
  const collapsed = collapseConsecutiveAirports(codes);
  if (collapsed.length < 2) return [];
  return collapsed
    .slice(0, -1)
    .map((from, i) => `${formatAirport(from)} → ${formatAirport(collapsed[i + 1])}`);
}

export function formatMultiStopAirportChain(
  codes: string[],
  formatAirport: (code: string) => string = (c) => c.trim().toUpperCase()
): string {
  const segments = multiStopRouteSegmentsFromCodes(codes, formatAirport);
  if (segments.length > 0) return segments.join(" + ");
  const collapsed = collapseConsecutiveAirports(codes);
  if (collapsed.length === 0) return "";
  return formatAirport(collapsed[0]);
}

export function multiStopRouteSegmentsFromLegs(
  legs: Array<{ departureAirport?: string | null; arrivalAirport?: string | null }> | undefined | null,
  formatAirport: (code: string) => string = (c) => c.trim().toUpperCase()
): string[] | null {
  const points = multiStopTouchpointsFromLegs(legs);
  if (!points || points.length < 2) return null;
  const segments = multiStopRouteSegmentsFromCodes(points, formatAirport);
  return segments.length > 0 ? segments : null;
}

export function formatMultiStopRouteFromLegs(
  legs: Array<{ departureAirport?: string | null; arrivalAirport?: string | null }> | undefined | null,
  formatAirport: (code: string) => string = (c) => c.trim().toUpperCase()
): string | null {
  const segments = multiStopRouteSegmentsFromLegs(legs, formatAirport);
  if (!segments) return null;
  return segments.join(" + ");
}
