import { classifyTrip, getUniqueDestinations } from "@/utils/tripClassifier";
import type { WantType } from "@/types/enums";

type ViewerTripLike = {
  instanceId: string;
  startDate: Date;
  blockHours: number;
  tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
  legs: { departureAirport: string; arrivalAirport: string; departureDate: Date; arrivalDate: Date }[];
  layovers?: { durationDecimal: number }[];
};

type ViewerScheduleLike = {
  month: number;
  year: number;
  trips: ViewerTripLike[];
};

type PostLike = {
  wantType: WantType;
  wantDestinations: string[];
  wantExclude: string[];
  wantMinLayover: number | null;
  offeredTrips: {
    departureDate: Date;
    destination: string;
    creditHours: number;
    hasLayover: boolean;
    layoverHours: number | null;
    tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
    scheduleTrip: { legs: { departureAirport: string; arrivalAirport: string }[] } | null;
  }[];
  wtfDays: number[];
};

export interface ScoreBreakdown {
  wtfDayOverlap: number;
  destinationMatch: number;
  blockHoursBalance: number;
  tripTypeMatch: number;
  sameDateBonus: number;
  layoverDuration: number;
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
  };
  const matchingTrips: string[] = [];
  const reasons: string[] = [];
  const viewerTrips = viewerSchedule.trips;
  const viewerDaysOff = getViewerDaysOff(viewerSchedule);

  breakdown.wtfDayOverlap = scoreWtfDays(post, viewerTrips, viewerDaysOff, reasons);
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

  return { total, breakdown, matchingTrips: Array.from(new Set(matchingTrips)), reasons };
}

function scoreWtfDays(
  post: PostLike,
  _viewerTrips: ViewerTripLike[],
  viewerDaysOff: number[],
  reasons: string[]
): number {
  if (post.wtfDays.length === 0) {
    reasons.push("No date constraint - flexible");
    return 15;
  }
  const overlappingDays = post.wtfDays.filter((d) => viewerDaysOff.includes(d));
  if (overlappingDays.length === 0) {
    reasons.push("No matching available days");
    return 0;
  }
  const overlapRatio = overlappingDays.length / post.wtfDays.length;
  const postTripDays = post.offeredTrips.map((t) => new Date(t.departureDate).getUTCDate());
  const viewerCanTakeTrip = postTripDays.some((d) => viewerDaysOff.includes(d));
  if (!viewerCanTakeTrip) {
    reasons.push("Posted trips conflict with viewer schedule");
    return 2;
  }
  const score = Math.round(overlapRatio * 20) + 5;
  reasons.push(`${overlappingDays.length}/${post.wtfDays.length} WTF days available`);
  return Math.min(25, score);
}

function getViewerDaysOff(schedule: ViewerScheduleLike): number[] {
  const dutyDays = new Set<number>();
  for (const trip of schedule.trips) {
    for (const leg of trip.legs) {
      dutyDays.add(new Date(leg.departureDate).getUTCDate());
      dutyDays.add(new Date(leg.arrivalDate).getUTCDate());
    }
  }
  const daysInMonth = new Date(schedule.year, schedule.month, 0).getDate();
  const daysOff: number[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    if (!dutyDays.has(d)) daysOff.push(d);
  }
  return daysOff;
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

  if (post.wantType === "ANYTHING" || post.wantType === "ANY_FLIGHT") {
    reasons.push("Poster open to any destination");
    return 12;
  }

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
    reasons.push("Has non-excluded destinations");
    return 15;
  }

  return 10;
}

function scoreBlockHours(
  post: PostLike,
  viewerTrips: ViewerTripLike[],
  viewerMonthlyBlock: number,
  matchingTrips: string[],
  reasons: string[]
): number {
  const postTotalBlock = post.offeredTrips.reduce((sum, t) => sum + (t.creditHours || 0), 0);
  let bestScore = 0;
  let bestTrip: string | null = null;

  for (const trip of viewerTrips) {
    const diffMinutes = Math.abs(postTotalBlock - trip.blockHours) * 60;
    let tripScore = 0;
    if (diffMinutes <= 20) {
      tripScore = 15;
      reasons.push(`Block hours within ±20m (${formatHours(trip.blockHours)} vs ${formatHours(postTotalBlock)})`);
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
  reasons: string[]
): number {
  switch (post.wantType) {
    case "LAYOVER":
    case "LONGER_LAYOVER": {
      const layoverTrips = viewerTrips.filter((t) => classifyTrip(t) === "LAYOVER");
      if (layoverTrips.length === 0) return 0;
      for (const trip of layoverTrips) matchingTrips.push(trip.instanceId);
      reasons.push(`Has ${layoverTrips.length} layover trip(s)`);
      return 15;
    }
    case "ROUND_TRIP": {
      const turnarounds = viewerTrips.filter((t) => classifyTrip(t) === "TURNAROUND");
      if (turnarounds.length === 0) return 0;
      reasons.push(`Has ${turnarounds.length} turnaround trip(s)`);
      return 15;
    }
    case "ANY_FLIGHT":
      return viewerTrips.length > 0 ? 12 : 0;
    case "DAYS_OFF":
      return 10;
    case "ANYTHING":
      return 10;
    default:
      return 5;
  }
}

function scoreSameDate(post: PostLike, viewerTrips: ViewerTripLike[], reasons: string[]): number {
  const postDates = post.offeredTrips.map((t) => new Date(t.departureDate).getUTCDate());
  for (const trip of viewerTrips) {
    const tripDate = new Date(trip.startDate).getUTCDate();
    if (postDates.includes(tripDate)) {
      reasons.push("Same-day swap possible");
      return 10;
    }
  }
  for (const trip of viewerTrips) {
    const tripDate = new Date(trip.startDate).getUTCDate();
    for (const postDate of postDates) {
      if (Math.abs(tripDate - postDate) <= 2) {
        reasons.push("Swap dates within 2 days");
        return 5;
      }
    }
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

  return 7;
}

function formatHours(decimal: number): string {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
}
