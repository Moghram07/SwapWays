/**
 * Fingerprints offered trips so duplicate OPEN offers (same user) can be rejected.
 * Schedule-linked trips: sched:<scheduleTripId>. Manual: normalized date/type/report/dests/flight/layover.
 */

import { normalizeAirportCode } from "@/utils/airportNames";
import { collapseConsecutiveAirports } from "@/utils/multiStopRouteDisplay";

export function normalizeFlightNumberForDedupe(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  return s.toUpperCase().startsWith("DH") ? s.slice(2) : s;
}

export function normalizeReportTimeForDedupe(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(".", ":").replace(/Z$/i, "");
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(normalized) ? normalized : null;
}

function orderedDestinations(
  destinations: string[] | null | undefined,
  destination: string | null | undefined
): string[] {
  let raw: string[];
  if (destinations && destinations.length > 0) {
    raw = destinations.map((d) => normalizeAirportCode(String(d))).filter(Boolean);
  } else {
    const single = normalizeAirportCode(String(destination ?? ""));
    raw = single ? [single] : [];
  }
  return collapseConsecutiveAirports(raw);
}

/**
 * Same-day manual MULTI_STOP with identical stop sequence (ignores report/flight tweaks).
 * Used to catch duplicate Quick posts that only differ in optional fields.
 */
export function looseManualMultiStopPostKeyFromTrips(
  trips: Array<{
    scheduleTripId: string | null;
    tripType: string;
    departureDate: Date;
    destinations: string[];
    destination: string;
  }>
): string | null {
  if (trips.length !== 1) return null;
  const t = trips[0]!;
  if (t.scheduleTripId) return null;
  if (t.tripType !== "MULTI_STOP") return null;
  const raw =
    t.destinations && t.destinations.length > 0
      ? t.destinations.map((d) => normalizeAirportCode(String(d)))
      : [normalizeAirportCode(t.destination)];
  const collapsed = collapseConsecutiveAirports(raw.filter(Boolean));
  const dests = collapsed.join(",");
  return `loose:${t.departureDate.toISOString().slice(0, 10)}|MULTI_STOP|${dests}`;
}

export type SwapPostTripFingerprintInput = {
  scheduleTripId?: string | null;
  departureDate: Date;
  tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
  reportTime?: string | null;
  destinations?: string[];
  destination: string;
  flightNumber?: string | null;
  layoverHours?: number | null;
};

export function offeredTripFingerprintFromCandidate(t: SwapPostTripFingerprintInput): string {
  const scheduleId = t.scheduleTripId?.trim();
  if (scheduleId) return `sched:${scheduleId}`;

  const dateStr = t.departureDate.toISOString().slice(0, 10);
  const dests = orderedDestinations(t.destinations, t.destination).join(",");
  const report = normalizeReportTimeForDedupe(t.reportTime) ?? "";
  const flight = normalizeFlightNumberForDedupe(t.flightNumber) ?? "";
  const layover = t.tripType === "LAYOVER" ? String(t.layoverHours ?? "") : "";
  return `man:${dateStr}|${t.tripType}|${report}|${dests}|${flight}|${layover}`;
}

/** Row shape from Prisma select for `offeredTrips`. */
export type StoredOfferedTripForDedupe = {
  scheduleTripId: string | null;
  departureDate: Date;
  tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
  reportTime: string | null;
  destinations: string[];
  destination: string;
  flightNumber: string | null;
  layoverHours: number | null;
};

export function offeredTripFingerprintFromStored(row: StoredOfferedTripForDedupe): string {
  return offeredTripFingerprintFromCandidate({
    scheduleTripId: row.scheduleTripId,
    departureDate: row.departureDate,
    tripType: row.tripType,
    reportTime: row.reportTime,
    destinations: row.destinations,
    destination: row.destination,
    flightNumber: row.flightNumber,
    layoverHours: row.layoverHours,
  });
}

export function hasDuplicateAmongFingerprints(candidateFingerprints: string[], existing: Set<string>): boolean {
  return candidateFingerprints.some((fp) => existing.has(fp));
}
