import { getUniqueDestinations } from "@/utils/tripClassifier";
import { expandPostWtfToDateKeys } from "./viewerSignalDates";
import type { ViewerSignals } from "./viewerSignalsModel";
import {
  calculateMatchScore,
  type MatchScore,
  type PostLike,
  type ViewerScheduleLike,
  type ViewerTripLike,
} from "./softScoring";
import { calendarDaysApartUTC, dateKeyUTC } from "./dateMatch";

function posterOfferedDateKeys(post: PostLike): string[] {
  const keys: string[] = [];
  for (const t of post.offeredTrips) keys.push(dateKeyUTC(t.departureDate));
  if (post.quickDate) keys.push(dateKeyUTC(post.quickDate));
  return [...new Set(keys)];
}

function posterBlockTotal(post: PostLike): number {
  const fromTrips = post.offeredTrips.reduce(
    (s, t) => s + ((t as { blockHours?: number | null }).blockHours ?? t.creditHours ?? 0),
    0
  );
  if (fromTrips > 0) return fromTrips;
  return post.advancedBlockHours ?? 0;
}

function viewerHoursForCompare(signals: ViewerSignals, viewerMonthlyBlock: number): number {
  if (signals.viewerPostsBlockHoursTotal > 0) return signals.viewerPostsBlockHoursTotal;
  return viewerMonthlyBlock;
}

function withinTwoDaysAnyKey(dateKey: string, keySet: Set<string>): boolean {
  if (keySet.size === 0) return false;
  const d = new Date(`${dateKey}T12:00:00.000Z`);
  for (const k of keySet) {
    const other = new Date(`${k}T12:00:00.000Z`);
    if (calendarDaysApartUTC(d, other) <= 2) return true;
  }
  return false;
}

/** Airports the viewer is effectively "in the market" with: open posts + primary-month schedule legs. */
function viewerItineraryAirports(signals: ViewerSignals, primarySchedule: ViewerScheduleLike): Set<string> {
  const out = new Set(signals.offeredDestinations.map((d) => d.toUpperCase()));
  for (const trip of primarySchedule.trips) {
    for (const d of getUniqueDestinations(trip)) {
      out.add(d.toUpperCase());
    }
  }
  return out;
}

/** Poster airports we compare against the viewer (what they want + what they offer). */
function posterSurfaceAirports(post: PostLike): Set<string> {
  const s = new Set<string>();
  for (const d of post.wantDestinations) s.add(d.toUpperCase());
  for (const t of post.offeredTrips) s.add(t.destination.toUpperCase());
  for (const d of post.quickDestinations ?? []) s.add(d.toUpperCase());
  return s;
}

function itineraryAirportOverlap(viewerAir: Set<string>, posterAir: Set<string>): boolean {
  if (viewerAir.size === 0 || posterAir.size === 0) return false;
  for (const v of viewerAir) {
    if (posterAir.has(v)) return true;
  }
  return false;
}

/** Mutual-oriented sub-score (0-100) — bidirectional date + block + destination fit. */
function scoreMutualComponent(
  signals: ViewerSignals,
  post: PostLike,
  primarySchedule: ViewerScheduleLike,
  viewerHours: number,
  posterHours: number,
  reasons: string[]
): number {
  let s = 0;
  const posterKeys = posterOfferedDateKeys(post);
  const posterWtfKeys = expandPostWtfToDateKeys(post);

  let hitPosterInViewerWtf = false;
  let nearPosterInViewerWtf = false;
  for (const pk of posterKeys) {
    if (signals.wtfDateKeys.has(pk)) {
      hitPosterInViewerWtf = true;
      break;
    }
    if (withinTwoDaysAnyKey(pk, signals.wtfDateKeys)) nearPosterInViewerWtf = true;
  }
  if (hitPosterInViewerWtf) {
    s += 25;
    reasons.push("Their trip date matches your willing-to-fly days");
  } else if (nearPosterInViewerWtf) {
    s += 12;
    reasons.push("Their trip date is within 2 days of your willing-to-fly days");
  }

  let hitViewerOfferInPosterWtf = false;
  let nearViewerOfferInPosterWtf = false;
  for (const vk of signals.offeredDateKeys) {
    if (posterWtfKeys.has(vk)) {
      hitViewerOfferInPosterWtf = true;
      break;
    }
    if (withinTwoDaysAnyKey(vk, posterWtfKeys)) nearViewerOfferInPosterWtf = true;
  }
  if (hitViewerOfferInPosterWtf) {
    s += 25;
    reasons.push("Your offered date matches their willing-to-fly days");
  } else if (nearViewerOfferInPosterWtf) {
    s += 12;
    reasons.push("Your offered date within 2 days of their willing-to-fly days");
  }

  const mx = Math.max(viewerHours, posterHours, 1);
  const relDiff = Math.abs(viewerHours - posterHours) / mx;
  if (relDiff <= 0.1) {
    s += 20;
    reasons.push("Block hours within 10%");
  } else if (relDiff <= 0.2) {
    s += 12;
    reasons.push("Block hours within 20%");
  }

  const posterDests = [
    ...post.offeredTrips.map((t) => t.destination.toUpperCase()),
    ...(post.quickDestinations ?? []).map((d) => d.toUpperCase()),
  ];
  const viewerAir = viewerItineraryAirports(signals, primarySchedule);
  const posterAir = posterSurfaceAirports(post);
  const routeOverlap = itineraryAirportOverlap(viewerAir, posterAir);

  const wantedSet = new Set(signals.wantedDestinations);
  if (wantedSet.size > 0 && posterDests.some((d) => wantedSet.has(d))) {
    s += 15;
    reasons.push("They offer a airport you want");
  } else if (signals.hasAnyDestinationFlex) {
    if (routeOverlap) {
      s += 15;
      reasons.push("You are open to their destination");
    } else {
      s += 5;
      reasons.push("Flexible on destinations (no itinerary overlap yet)");
    }
  }

  const postWantSet = new Set(post.wantDestinations.map((d) => d.toUpperCase()));
  const posterOpen =
    post.wantType === "ANYTHING" ||
    post.wantType === "ANY_FLIGHT" ||
    post.wantType === "DAYS_OFF";
  if (postWantSet.size > 0 && signals.offeredDestinations.some((d) => postWantSet.has(d))) {
    s += 15;
    reasons.push("You offer a airport they want");
  } else if (posterOpen && viewerAir.size > 0) {
    const ex = new Set(post.wantExclude.map((d) => d.toUpperCase()));
    const hasUnexcluded = [...viewerAir].some((d) => !ex.has(d));
    if (routeOverlap && hasUnexcluded) {
      s += 15;
      reasons.push("They are flexible and your itinerary overlaps theirs");
    } else if (hasUnexcluded) {
      s += 6;
      reasons.push("They are flexible; limited itinerary overlap");
    }
  }

  if (!routeOverlap) {
    s = Math.round(s * 0.62);
    reasons.push("Itinerary airports mostly different — mutual fit discounted");
  }

  return Math.min(100, s);
}

function scoreDateAlignmentComponent(
  signals: ViewerSignals,
  post: PostLike,
  primarySchedule: ViewerScheduleLike,
  reasons: string[]
): number {
  let s = 0;
  const posterKeys = posterOfferedDateKeys(post);
  const posterWtfKeys = expandPostWtfToDateKeys(post);

  let a = false;
  let aNear = false;
  for (const pk of posterKeys) {
    if (signals.wtfDateKeys.has(pk)) {
      a = true;
      break;
    }
    if (withinTwoDaysAnyKey(pk, signals.wtfDateKeys)) aNear = true;
  }
  if (a) {
    s += 30;
    reasons.push("Strong date alignment with your WTF days");
  } else if (aNear) {
    s += 20;
    reasons.push("Date near your WTF days");
  }

  let b = false;
  let bNear = false;
  for (const pk of posterKeys) {
    if (signals.offeredDateKeys.has(pk)) {
      b = true;
      break;
    }
    if (withinTwoDaysAnyKey(pk, signals.offeredDateKeys)) bNear = true;
  }
  if (b) {
    s += 30;
    reasons.push("Their date matches a day you already offer");
  } else if (bNear) {
    s += 15;
    reasons.push("Their date near a day you offer");
  }

  let overlapWtf = false;
  for (const ok of signals.offeredDateKeys) {
    if (posterWtfKeys.has(ok)) {
      overlapWtf = true;
      break;
    }
  }
  if (overlapWtf) {
    s += 25;
    reasons.push("Your offers overlap their willing-to-fly calendar");
  }

  const viewerAir = viewerItineraryAirports(signals, primarySchedule);
  const posterAir = posterSurfaceAirports(post);
  if (!itineraryAirportOverlap(viewerAir, posterAir)) {
    s = Math.round(s * 0.55);
    reasons.push("Date fit tempered — destinations barely overlap");
  }

  return Math.min(100, s);
}

function scoreBlockBandComponent(viewerHours: number, posterHours: number, reasons: string[]): number {
  const mx = Math.max(viewerHours, posterHours, 1e-6);
  const diff = Math.abs(viewerHours - posterHours) / mx;
  if (diff < 0.1) {
    reasons.push("Block band: tight match");
    return 30;
  }
  if (diff < 0.2) {
    reasons.push("Block band: good");
    return 20;
  }
  if (diff < 0.3) {
    reasons.push("Block band: moderate");
    return 10;
  }
  return 0;
}

function scheduleForPrimary(
  signals: ViewerSignals,
  primaryYear: number,
  primaryMonth: number
): ViewerScheduleLike | null {
  const key = `${primaryYear}-${String(primaryMonth).padStart(2, "0")}`;
  const trips = signals.scheduleTripsByMonth.get(key);
  if (trips && trips.length > 0) {
    return { month: primaryMonth, year: primaryYear, trips };
  }
  return null;
}

function collectMatchingTrips(signals: ViewerSignals, post: PostLike, viewerTrips: ViewerTripLike[]): string[] {
  const matching: string[] = [];
  const wantedByPosterUpper = new Set(post.wantDestinations.map((d) => d.toUpperCase()));
  for (const trip of viewerTrips) {
    const dests = getUniqueDestinations(trip).map((d) => d.toUpperCase());
    if (wantedByPosterUpper.size > 0 && dests.some((d) => wantedByPosterUpper.has(d))) {
      matching.push(trip.instanceId);
    }
  }
  const viewerWant = new Set(signals.wantedDestinations);
  if (viewerWant.size > 0) {
    for (const trip of viewerTrips) {
      const dests = getUniqueDestinations(trip).map((d) => d.toUpperCase());
      if (dests.some((d) => viewerWant.has(d))) matching.push(trip.instanceId);
    }
  }
  return [...new Set(matching)];
}

/**
 * Blended score: mutual (40%) + one-sided legacy (30%) + date alignment (20%) + block band (10%).
 */
export function scoreWithSignals(
  signals: ViewerSignals,
  post: PostLike,
  primarySchedule: ViewerScheduleLike,
  viewerMonthlyBlock: number
): MatchScore {
  const reasons: string[] = [];
  const posterHours = posterBlockTotal(post);
  const viewerHours = viewerHoursForCompare(signals, viewerMonthlyBlock);

  const mutual = scoreMutualComponent(signals, post, primarySchedule, viewerHours, posterHours, reasons);
  const oneSidedResult = calculateMatchScore(primarySchedule, viewerMonthlyBlock, post);
  const oneSided = oneSidedResult.total;
  const dateAlign = scoreDateAlignmentComponent(signals, post, primarySchedule, reasons);
  const blockBand = scoreBlockBandComponent(viewerHours, posterHours, reasons);

  const total = Math.min(
    100,
    Math.round(mutual * 0.4 + oneSided * 0.3 + dateAlign * 0.2 + blockBand * 0.1)
  );

  reasons.push(...oneSidedResult.reasons);

  const matchingTrips = [
    ...new Set([...collectMatchingTrips(signals, post, primarySchedule.trips), ...oneSidedResult.matchingTrips]),
  ];

  return {
    total,
    breakdown: {
      ...oneSidedResult.breakdown,
      mutualSwap: mutual,
      oneSidedFit: oneSided,
      dateAlignment: dateAlign,
      blockBand,
    },
    matchingTrips,
    reasons: [...new Set(reasons)],
  };
}

/**
 * Prefer trips from signals for the candidate post month; fall back to loaded primary schedule.
 */
export function scoreWithSignalsOrFallbackSchedule(
  signals: ViewerSignals,
  post: PostLike,
  primaryYear: number,
  primaryMonth: number,
  fallbackSchedule: ViewerScheduleLike,
  viewerMonthlyBlock: number
): MatchScore {
  const fromMap = scheduleForPrimary(signals, primaryYear, primaryMonth);
  const primary = fromMap ?? fallbackSchedule;
  return scoreWithSignals(signals, post, primary, viewerMonthlyBlock);
}
