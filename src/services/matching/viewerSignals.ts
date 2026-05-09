import { findActiveSwapPostsByUserId } from "@/repositories/swapPostRepository";
import { findSchedulesForUser } from "@/repositories/scheduleRepository";
import type { WantType } from "@/types/enums";
import { dateKeyUTC } from "./dateMatch";
import { expandPostWtfToDateKeys } from "./viewerSignalDates";
import type { SignalScheduleTrip, ViewerSignals } from "./viewerSignalsModel";

export type { SignalScheduleTrip, ViewerSignals } from "./viewerSignalsModel";
export { viewerHasComparableSignals } from "./viewerSignalsModel";
export { expandPostWtfToDateKeys } from "./viewerSignalDates";

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * Aggregates OPEN swap posts + uploaded schedules for one viewer.
 * Called once per request; pass into scoring to avoid N× reloads.
 */
export async function buildViewerSignals(viewerId: string): Promise<ViewerSignals> {
  const [openPosts, schedules] = await Promise.all([
    findActiveSwapPostsByUserId(viewerId),
    findSchedulesForUser(viewerId),
  ]);

  const offeredDates: Date[] = [];
  const offeredDateKeys = new Set<string>();
  const offeredDestinations: string[] = [];
  const wantedDestinations: string[] = [];
  const excludedDestinations: string[] = [];
  const wtfDateKeys = new Set<string>();
  const wantTypes: WantType[] = [];
  let viewerPostsBlockHoursTotal = 0;
  let wantEqualHours = false;
  let wantSameDate = false;
  let wantMinLayover: number | null = null;
  let minLayoverSeen = false;

  for (const post of openPosts) {
    wantTypes.push(post.wantType as WantType);
    for (const d of post.wantDestinations ?? []) wantedDestinations.push(d.toUpperCase());
    for (const d of post.wantExclude ?? []) excludedDestinations.push(d.toUpperCase());
    if (post.wantEqualHours) wantEqualHours = true;
    if (post.wantSameDate) wantSameDate = true;
    if (post.wantMinLayover != null) {
      wantMinLayover = minLayoverSeen
        ? Math.min(wantMinLayover ?? post.wantMinLayover, post.wantMinLayover)
        : post.wantMinLayover;
      minLayoverSeen = true;
    }

    for (const k of expandPostWtfToDateKeys(post)) wtfDateKeys.add(k);

    for (const t of post.offeredTrips) {
      if (t.departureDate) {
        offeredDates.push(t.departureDate);
        offeredDateKeys.add(dateKeyUTC(t.departureDate));
      }
      if (t.destination) offeredDestinations.push(t.destination.toUpperCase());
      for (const x of t.destinations ?? []) offeredDestinations.push(x.toUpperCase());
      const bh = t.blockHours ?? t.creditHours ?? 0;
      viewerPostsBlockHoursTotal += typeof bh === "number" ? bh : 0;
    }
    for (const d of post.quickDestinations ?? []) offeredDestinations.push(d.toUpperCase());
    if (post.quickDate) {
      offeredDates.push(post.quickDate);
      offeredDateKeys.add(dateKeyUTC(post.quickDate));
    }
  }

  const dedupe = <T>(xs: T[]): T[] => Array.from(new Set(xs));

  const hasAnyDestinationFlex = wantTypes.some(
    (w) => w === "ANYTHING" || w === "ANY_FLIGHT" || w === "DAYS_OFF"
  );

  const scheduleTripsByMonth = new Map<string, SignalScheduleTrip[]>();
  for (const s of schedules) {
    const key = monthKey(s.year, s.month);
    const trips: SignalScheduleTrip[] = [];
    for (const t of s.trips) {
      trips.push({
        instanceId: t.instanceId,
        startDate: t.startDate,
        blockHours: t.blockHours,
        tripType: t.tripType as SignalScheduleTrip["tripType"],
        legs: t.legs.map((leg) => ({
          departureAirport: leg.departureAirport,
          arrivalAirport: leg.arrivalAirport,
          departureDate: leg.departureDate,
          arrivalDate: leg.arrivalDate,
        })),
        layovers:
          "layovers" in t && Array.isArray((t as { layovers?: { durationDecimal: number }[] }).layovers)
            ? (t as { layovers: { durationDecimal: number }[] }).layovers.map((l) => ({
                durationDecimal: l.durationDecimal,
              }))
            : undefined,
      });
    }
    scheduleTripsByMonth.set(key, trips);
  }

  return {
    offeredDates,
    offeredDateKeys,
    offeredDestinations: dedupe(offeredDestinations),
    wantedDestinations: dedupe(wantedDestinations),
    excludedDestinations: dedupe(excludedDestinations),
    wtfDateKeys,
    wantTypes: dedupe(wantTypes),
    hasAnyDestinationFlex,
    viewerPostsBlockHoursTotal,
    scheduleTripsByMonth,
    hasActivePosts: openPosts.length > 0,
    hasSchedule: schedules.length > 0,
    wantEqualHours,
    wantSameDate,
    wantMinLayover,
    hasExplicitWtfFromPosts: openPosts.some((p) => (p.wtfDays?.length ?? 0) > 0),
  };
}
