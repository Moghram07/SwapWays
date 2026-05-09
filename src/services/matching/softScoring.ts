import { classifyTrip, getUniqueDestinations } from "@/utils/tripClassifier";
import type { WantType } from "@/types/enums";
import { calendarDaysApartUTC, dateKeyUTC, expandDayOfMonthToKeysInMonth } from "./dateMatch";

export type ViewerTripLike = {
  instanceId: string;
  startDate: Date;
  blockHours: number;
  tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
  legs: { departureAirport: string; arrivalAirport: string; departureDate: Date; arrivalDate: Date }[];
  layovers?: { durationDecimal: number }[];
};

export type ViewerScheduleLike = {
  month: number;
  year: number;
  trips: ViewerTripLike[];
};

export type PostLike = {
  wantType: WantType;
  wantDestinations: string[];
  wantExclude: string[];
  wantMinLayover: number | null;
  offeredTrips: {
    departureDate: Date;
    destination: string;
    creditHours: number | null;
    blockHours?: number | null;
    hasLayover: boolean;
    layoverHours: number | null;
    tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
    scheduleTrip: { legs: { departureAirport: string; arrivalAirport: string }[] } | null;
  }[];
  wtfDays: number[];
  quickTripType?: "LAYOVER" | "TURNAROUND" | "MULTI_STOP" | null;
  quickDestinations?: string[];
  quickDate?: Date | null;
  quickLayoverHours?: number | null;
  advancedBlockHours?: number | null;
};

export interface ScoreBreakdown {
  wtfDayOverlap: number;
  destinationMatch: number;
  blockHoursBalance: number;
  tripTypeMatch: number;
  sameDateBonus: number;
  layoverDuration: number;
  mutualSwap: number;
  oneSidedFit: number;
  dateAlignment: number;
  blockBand: number;
}


export interface MatchScore {
  total: number;
  breakdown: ScoreBreakdown;
  matchingTrips: string[];
  reasons: string[];
}

export function calculateMatchScore(
  viewerSchedule: ViewerScheduleLike,
  viewerMonthlyBlock: number,
  post: PostLike
): MatchScore {
  const breakdown: ScoreBreakdown = {
    wtfDayOverlap: 0,
    destinationMatch: 0,
    blockHoursBalance: 0,
    tripTypeMatch: 0,
    sameDateBonus: 0,
    layoverDuration: 0,
    mutualSwap: 0,
    oneSidedFit: 0,
    dateAlignment: 0,
    blockBand: 0,
  };
  const matchingTrips: string[] = [];
  const reasons: string[] = [];
  const viewerTrips = viewerSchedule.trips;
  const viewerDaysOffDateKeys = getViewerDaysOffDateKeys(viewerSchedule);

  breakdown.wtfDayOverlap = scoreWtfDays(post, viewerTrips, viewerSchedule, viewerDaysOffDateKeys, reasons);
  breakdown.destinationMatch = scoreDestination(post, viewerTrips, matchingTrips, reasons);
  breakdown.blockHoursBalance = scoreBlockHours(post, viewerTrips, viewerMonthlyBlock, matchingTrips, reasons);
  breakdown.tripTypeMatch = scoreTripType(post, viewerTrips, matchingTrips, reasons);
  breakdown.sameDateBonus = scoreSameDate(post, viewerTrips, reasons);
  breakdown.layoverDuration = scoreLayoverDuration(post, viewerTrips, reasons);

  const total = Math.min(
    100,
    breakdown.wtfDayOverlap +
      breakdown.destinationMatch +
      breakdown.blockHoursBalance +
      breakdown.tripTypeMatch +
      breakdown.sameDateBonus +
      breakdown.layoverDuration
  );
  breakdown.oneSidedFit = total;

  return { total, breakdown, matchingTrips: Array.from(new Set(matchingTrips)), reasons };
}

function scoreWtfDays(
  post: PostLike,
  viewerTrips: ViewerTripLike[],
  viewerSchedule: ViewerScheduleLike,
  viewerDaysOffDateKeys: Set<string>,
  reasons: string[]
): number {
  if (post.wtfDays.length === 0) {
    return 0;
  }
  const y = viewerSchedule.year;
  const m = viewerSchedule.month;
  const postWtfKeys = new Set(expandDayOfMonthToKeysInMonth(y, m, post.wtfDays));

  if (post.wantType === "DAYS_OFF") {
    const viewerTripKeys = new Set(viewerTrips.map((t) => dateKeyUTC(t.startDate)));
    const overlapping = [...postWtfKeys].filter((k) => viewerTripKeys.has(k));
    if (overlapping.length === 0) {
      reasons.push("No viewer trips on willing-to-fly days");
      return 0;
    }
    const ratio = overlapping.length / postWtfKeys.size;
    const score = 20 + Math.round(ratio * 15);
    reasons.push(`${overlapping.length}/${postWtfKeys.size} willing-to-fly days matched`);
    return Math.min(35, score);
  }

  const overlappingOff = [...postWtfKeys].filter((k) => viewerDaysOffDateKeys.has(k));
  if (overlappingOff.length === 0) {
    return 0;
  }
  const overlapRatio = overlappingOff.length / postWtfKeys.size;
  const postTripKeys = post.offeredTrips.map((t) => dateKeyUTC(t.departureDate));
  const viewerCanTakeTrip = postTripKeys.some((k) => viewerDaysOffDateKeys.has(k));
  if (!viewerCanTakeTrip) {
    return 2;
  }
  const score = Math.round(overlapRatio * 20) + 5;
  reasons.push(`${overlappingOff.length}/${postWtfKeys.size} WTF days available`);
  return Math.min(25, score);
}

function getViewerDaysOffDateKeys(schedule: ViewerScheduleLike): Set<string> {
  const duty = new Set<string>();
  for (const trip of schedule.trips) {
    for (const leg of trip.legs) {
      duty.add(dateKeyUTC(leg.departureDate));
      duty.add(dateKeyUTC(leg.arrivalDate));
    }
  }
  const y = schedule.year;
  const m = schedule.month;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const off = new Set<string>();
  for (let dom = 1; dom <= daysInMonth; dom++) {
    const key = dateKeyUTC(new Date(Date.UTC(y, m - 1, dom)));
    if (!duty.has(key)) off.add(key);
  }
  return off;
}

function scoreDestination(
  post: PostLike,
  viewerTrips: ViewerTripLike[],
  matchingTrips: string[],
  reasons: string[]
): number {
  if (post.wantDestinations.length > 0) {
    const wantedCodes = new Set(post.wantDestinations.map((d) => d.toUpperCase()));
    for (const trip of viewerTrips) {
      const tripDests = getUniqueDestinations(trip).map((d) => d.toUpperCase());
      const wanted = tripDests.filter((d) => wantedCodes.has(d));
      if (wanted.length > 0) {
        matchingTrips.push(trip.instanceId);
        reasons.push(`Has ${wanted.join(", ")} (wanted by poster)`);
        return 20;
      }
    }
    if (post.wantType === "ANYTHING") {
      reasons.push("No preferred destination match, but poster is flexible");
      return 5;
    }
    reasons.push("No matching destinations");
    return 0;
  }

  const openToAnyDestinationPreference =
    post.wantType === "ANYTHING" ||
    post.wantType === "ANY_FLIGHT" ||
    (post.wantDestinations.length === 0 && post.wantType !== "SPECIFIC");

  if (openToAnyDestinationPreference) {
    if (post.wantExclude.length > 0) {
      const excluded = new Set(post.wantExclude.map((d) => d.toUpperCase()));
      let hasNonExcluded = false;
      for (const trip of viewerTrips) {
        const tripDests = getUniqueDestinations(trip).map((d) => d.toUpperCase());
        const isExcluded = tripDests.some((d) => excluded.has(d));
        if (!isExcluded) {
          hasNonExcluded = true;
          matchingTrips.push(trip.instanceId);
        }
      }
      if (!hasNonExcluded) {
        reasons.push("All available destinations are excluded");
        return 0;
      }
      return 10;
    }
    return 8;
  }

  return 0;
}

function scoreBlockHours(
  post: PostLike,
  viewerTrips: ViewerTripLike[],
  viewerMonthlyBlock: number,
  matchingTrips: string[],
  reasons: string[]
): number {
  const offeredTotal = post.offeredTrips.reduce((sum, t) => sum + (t.creditHours || 0), 0);
  const postTotalBlock =
    offeredTotal > 0 ? offeredTotal : post.advancedBlockHours ?? 0;
  if (postTotalBlock <= 0) {
    reasons.push("No block-hours provided, scoring by trip type/date only");
    return 4;
  }
  let bestScore = 0;
  let bestTrip: string | null = null;

  for (const trip of viewerTrips) {
    const diffMinutes = Math.abs(postTotalBlock - trip.blockHours) * 60;
    let tripScore = 0;
    if (diffMinutes <= 20) {
      tripScore = 15;
      reasons.push(`Block hours within Â±20m (${formatHours(trip.blockHours)} vs ${formatHours(postTotalBlock)})`);
    } else if (diffMinutes <= 60) {
      tripScore = 12;
    } else if (diffMinutes <= 120) {
      tripScore = 8;
    } else {
      const viewerNewMonthly = viewerMonthlyBlock - trip.blockHours + postTotalBlock;
      if (viewerMonthlyBlock > 85 && viewerNewMonthly < viewerMonthlyBlock) {
        tripScore = 10;
      } else if (viewerNewMonthly >= 65 && viewerNewMonthly <= 85) {
        tripScore = 6;
      } else {
        tripScore = 2;
      }
    }

    const projectedMonthly = viewerMonthlyBlock - trip.blockHours + postTotalBlock;
    if (projectedMonthly >= 65 && projectedMonthly <= 85) {
      tripScore += 5;
    } else if (projectedMonthly > 90) {
      tripScore -= 3;
      reasons.push("Swap may increase monthly block above 90h");
    }

    if (tripScore > bestScore) {
      bestScore = tripScore;
      bestTrip = trip.instanceId;
    }
  }

  if (bestTrip) matchingTrips.push(bestTrip);
  return Math.max(0, Math.min(20, bestScore));
}

function scoreTripType(
  post: PostLike,
  viewerTrips: ViewerTripLike[],
  matchingTrips: string[],
  _reasons: string[]
): number {
  const offeredTripType = post.offeredTrips[0]?.tripType ?? post.quickTripType ?? null;
  switch (post.wantType) {
    case "LAYOVER":
    case "LONGER_LAYOVER": {
      const layoverTrips = viewerTrips.filter((t) => classifyTrip(t) === "LAYOVER");
      if (layoverTrips.length === 0) return 0;
      for (const trip of layoverTrips) matchingTrips.push(trip.instanceId);
      return 12;
    }
    case "ROUND_TRIP": {
      const turnarounds = viewerTrips.filter((t) => classifyTrip(t) === "TURNAROUND");
      if (turnarounds.length === 0) return 0;
      return 12;
    }
    case "ANY_FLIGHT":
      if (!offeredTripType) return viewerTrips.length > 0 ? 8 : 0;
      return viewerTrips.some((t) => t.tripType === offeredTripType) ? 10 : 5;
    case "DAYS_OFF":
      return 8;
    case "ANYTHING":
      return 8;
    default:
      return 4;
  }
}

function scoreSameDate(post: PostLike, viewerTrips: ViewerTripLike[], reasons: string[]): number {
  const postDateKeys =
    post.offeredTrips.length > 0
      ? post.offeredTrips.map((t) => dateKeyUTC(t.departureDate))
      : post.quickDate
        ? [dateKeyUTC(post.quickDate)]
        : [];
  if (postDateKeys.length === 0) return 3;
  for (const trip of viewerTrips) {
    const tk = dateKeyUTC(trip.startDate);
    if (postDateKeys.includes(tk)) {
      reasons.push("Same-day swap possible");
      return 10;
    }
  }
  for (const trip of viewerTrips) {
    for (const pk of postDateKeys) {
      if (calendarDaysApartUTC(trip.startDate, new Date(`${pk}T12:00:00.000Z`)) <= 2) {
        reasons.push("Swap dates within 2 days");
        return 5;
      }
    }
  }
  if (post.wantType === "DAYS_OFF" && post.wtfDays.length > 0) {
    reasons.push("Date mismatch tolerated due to off-day flexibility");
    return 4;
  }
  return 0;
}

function scoreLayoverDuration(post: PostLike, viewerTrips: ViewerTripLike[], reasons: string[]): number {
  if (post.wantType !== "LAYOVER" && post.wantType !== "LONGER_LAYOVER") return 5;
  const layoverTrips = viewerTrips.filter((t) => classifyTrip(t) === "LAYOVER");
  if (layoverTrips.length === 0) return 0;

  if (post.wantType === "LONGER_LAYOVER") {
    const postLayoverHours = post.offeredTrips
      .filter((t) => t.hasLayover)
      .map((t) => t.layoverHours || 0)
      .reduce((max, h) => Math.max(max, h), 0);
    const viewerMaxLayover = layoverTrips
      .flatMap((t) => t.layovers ?? [])
      .reduce((max, l) => Math.max(max, l.durationDecimal), 0);
    if (viewerMaxLayover > postLayoverHours) return 10;
    reasons.push("Layover not longer than poster requested");
    return 3;
  }

  if (post.wantMinLayover) {
    const viewerMaxLayover = layoverTrips
      .flatMap((t) => t.layovers ?? [])
      .reduce((max, l) => Math.max(max, l.durationDecimal), 0);
    if (viewerMaxLayover >= post.wantMinLayover) return 10;
    reasons.push("Layover below minimum requirement");
    return 2;
  }

  if (post.quickTripType === "LAYOVER" && post.quickLayoverHours != null) {
    const viewerMaxLayover = layoverTrips
      .flatMap((t) => t.layovers ?? [])
      .reduce((max, l) => Math.max(max, l.durationDecimal), 0);
    if (viewerMaxLayover >= post.quickLayoverHours) return 9;
    reasons.push("Layover below offered quick-post duration");
    return 3;
  }

  return 7;
}

function formatHours(decimal: number): string {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
}
