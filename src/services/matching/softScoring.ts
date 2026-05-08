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
    creditHours: number | null;
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

/** Lightweight shape of a viewer's own active SwapPost used by the mutual scorer. */
export type ViewerActivePostLike = {
  wantType: WantType;
  wantDestinations: string[];
  wantExclude: string[];
  wantMinLayover: number | null;
  wantEqualHours: boolean;
  wantSameDate: boolean;
  wtfDays: number[];
  offeredTrips: {
    departureDate: Date;
    destination: string;
    destinations?: string[];
    tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
    creditHours: number | null;
    blockHours: number | null;
    hasLayover: boolean;
    layoverHours: number | null;
  }[];
  quickTripType?: "LAYOVER" | "TURNAROUND" | "MULTI_STOP" | null;
  quickDestinations?: string[];
  quickDate?: Date | null;
  quickLayoverHours?: number | null;
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
  viewerTrips: ViewerTripLike[],
  viewerDaysOff: number[],
  reasons: string[]
): number {
  if (post.wtfDays.length === 0) {
    return 0;
  }
  if (post.wantType === "DAYS_OFF") {
    const viewerTripDays = viewerTrips.map((t) => new Date(t.startDate).getUTCDate());
    const overlappingDays = post.wtfDays.filter((d) => viewerTripDays.includes(d));
    if (overlappingDays.length === 0) {
      reasons.push("No viewer trips on willing-to-fly days");
      return 0;
    }
    const ratio = overlappingDays.length / post.wtfDays.length;
    const score = 20 + Math.round(ratio * 15);
    reasons.push(`${overlappingDays.length}/${post.wtfDays.length} willing-to-fly days matched`);
    return Math.min(35, score);
  }
  const overlappingDays = post.wtfDays.filter((d) => viewerDaysOff.includes(d));
  if (overlappingDays.length === 0) {
    return 0;
  }
  const overlapRatio = overlappingDays.length / post.wtfDays.length;
  const postTripDays = post.offeredTrips.map((t) => new Date(t.departureDate).getUTCDate());
  const viewerCanTakeTrip = postTripDays.some((d) => viewerDaysOff.includes(d));
  if (!viewerCanTakeTrip) {
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
  const postDates = post.offeredTrips.length
    ? post.offeredTrips.map((t) => new Date(t.departureDate).getUTCDate())
    : post.quickDate
      ? [new Date(post.quickDate).getUTCDate()]
      : [];
  if (postDates.length === 0) return 3;
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

// =====================================================================
// Mutual scoring — used when the viewer has their own active SwapPost.
// Two-direction fit:
//   1. B's offer satisfies A's wants (A2B-from-A's-view)
//   2. A's offer satisfies B's wants (B2A-from-B's-view)
// Final score = min(dirA, dirB) so both sides actually fit.
// =====================================================================

interface DirectionScore {
  total: number;
  reasons: string[];
}

function getOfferedTripFingerprints(
  post: ViewerActivePostLike | PostLike
): {
  destinations: string[];
  departureDays: number[];
  tripTypes: ("LAYOVER" | "TURNAROUND" | "MULTI_STOP")[];
  layoverHours: number[];
  totalBlockHours: number;
} {
  const destinations: string[] = [];
  const departureDays: number[] = [];
  const tripTypes: ("LAYOVER" | "TURNAROUND" | "MULTI_STOP")[] = [];
  const layoverHours: number[] = [];
  let totalBlockHours = 0;

  for (const trip of post.offeredTrips) {
    if (trip.destination) destinations.push(trip.destination.toUpperCase());
    const extras = (trip as { destinations?: string[] }).destinations;
    if (Array.isArray(extras)) {
      for (const d of extras) destinations.push(d.toUpperCase());
    }
    if (trip.departureDate) departureDays.push(trip.departureDate.getUTCDate());
    if (trip.tripType) tripTypes.push(trip.tripType);
    if (typeof trip.layoverHours === "number") layoverHours.push(trip.layoverHours);
    const block = (trip as { blockHours?: number | null; creditHours?: number | null }).blockHours
      ?? (trip as { creditHours?: number | null }).creditHours
      ?? 0;
    totalBlockHours += block;
  }

  if (destinations.length === 0 && Array.isArray(post.quickDestinations)) {
    for (const d of post.quickDestinations) destinations.push(d.toUpperCase());
  }
  if (departureDays.length === 0 && post.quickDate) {
    departureDays.push(post.quickDate.getUTCDate());
  }
  if (tripTypes.length === 0 && post.quickTripType) {
    tripTypes.push(post.quickTripType);
  }
  if (layoverHours.length === 0 && typeof post.quickLayoverHours === "number") {
    layoverHours.push(post.quickLayoverHours);
  }

  return {
    destinations: Array.from(new Set(destinations)),
    departureDays: Array.from(new Set(departureDays)),
    tripTypes: Array.from(new Set(tripTypes)),
    layoverHours,
    totalBlockHours,
  };
}

function scoreOfferAgainstWants(
  receiver: { label: "you" | "they" },
  offer: ReturnType<typeof getOfferedTripFingerprints>,
  wants: {
    wantType: WantType;
    wantDestinations: string[];
    wantExclude: string[];
    wantMinLayover: number | null;
    wantEqualHours: boolean;
    wantSameDate: boolean;
    wtfDays: number[];
  },
  receiverBlockHoursTotal: number
): DirectionScore {
  const reasons: string[] = [];
  let total = 0;
  // If receiver has specified destinations and the offer doesn't include any, the swap is
  // fundamentally not what they asked for — cap this direction.
  let directionCap = 100;

  // 1. Destination fit (max 30)
  const wantedSet = new Set(wants.wantDestinations.map((d) => d.toUpperCase()));
  const excludedSet = new Set(wants.wantExclude.map((d) => d.toUpperCase()));
  const offeredDests = offer.destinations;

  if (wantedSet.size > 0) {
    const matched = offeredDests.filter((d) => wantedSet.has(d));
    if (matched.length > 0) {
      total += 30;
      reasons.push(
        receiver.label === "you"
          ? `They offer ${matched.join(", ")} — on your wants list`
          : `You offer ${matched.join(", ")} — on their wants list`
      );
    } else if (wants.wantType === "ANYTHING" || wants.wantType === "ANY_FLIGHT") {
      total += 8;
    } else {
      // Receiver named specific destinations and none matched: this is a poor fit.
      // Cap the direction so trip-type/layover/date can't push it over 35.
      directionCap = 35;
    }
  } else if (wants.wantType === "ANYTHING" || wants.wantType === "ANY_FLIGHT") {
    // Open to anything; anything not excluded scores well.
    const notExcluded =
      excludedSet.size === 0 || offeredDests.every((d) => !excludedSet.has(d));
    total += notExcluded ? 18 : 0;
  } else if (wants.wantType === "DAYS_OFF") {
    total += 10;
  }

  if (excludedSet.size > 0 && offeredDests.length > 0) {
    const allExcluded = offeredDests.every((d) => excludedSet.has(d));
    if (allExcluded) {
      total = Math.max(0, total - 20);
      reasons.push(
        receiver.label === "you"
          ? `Their offer is in your excluded destinations`
          : `Your offer is in their excluded destinations`
      );
    }
  }

  // 2. Trip-type fit (max 20)
  switch (wants.wantType) {
    case "LAYOVER":
    case "LONGER_LAYOVER":
      if (offer.tripTypes.includes("LAYOVER")) {
        total += 20;
        reasons.push(
          receiver.label === "you"
            ? "They offer a layover trip — what you want"
            : "You offer a layover trip — what they want"
        );
      }
      break;
    case "ROUND_TRIP":
      if (offer.tripTypes.includes("TURNAROUND")) {
        total += 20;
        reasons.push(
          receiver.label === "you"
            ? "They offer a round trip — what you want"
            : "You offer a round trip — what they want"
        );
      }
      break;
    case "ANY_FLIGHT":
      if (offer.tripTypes.length > 0) total += 12;
      break;
    case "ANYTHING":
      if (offer.tripTypes.length > 0) total += 10;
      break;
    case "DAYS_OFF":
      // Days-off swap: trip type isn't directly comparable; small credit.
      total += 6;
      break;
    case "SPECIFIC":
      if (offer.tripTypes.length > 0) total += 8;
      break;
  }

  // 3. Layover-hours fit (max 15) — only for LAYOVER preferences
  if (
    (wants.wantType === "LAYOVER" || wants.wantType === "LONGER_LAYOVER") &&
    offer.tripTypes.includes("LAYOVER")
  ) {
    const minRequired = wants.wantMinLayover ?? 0;
    const maxOffered = offer.layoverHours.reduce((m, h) => Math.max(m, h), 0);
    if (minRequired > 0) {
      if (maxOffered >= minRequired) {
        total += 15;
        reasons.push(
          receiver.label === "you"
            ? `Layover ${maxOffered}h ≥ your minimum ${minRequired}h`
            : `Layover ${maxOffered}h ≥ their minimum ${minRequired}h`
        );
      } else if (maxOffered > 0) {
        total += 5;
        reasons.push(
          receiver.label === "you"
            ? `Layover ${maxOffered}h is below your ${minRequired}h minimum`
            : `Layover ${maxOffered}h is below their ${minRequired}h minimum`
        );
      }
    } else if (maxOffered > 0) {
      total += 10;
    }
  }

  // 4. Date alignment (max 20) — every offered departure on receiver's wtfDays
  if (wants.wtfDays.length > 0 && offer.departureDays.length > 0) {
    const wtfSet = new Set(wants.wtfDays);
    const matchingDays = offer.departureDays.filter((d) => wtfSet.has(d));
    if (matchingDays.length === offer.departureDays.length) {
      total += 20;
      const sortedDays = [...new Set(matchingDays)].sort((a, b) => a - b).join(", ");
      reasons.push(
        receiver.label === "you"
          ? `Departures on ${sortedDays} match your willing-to-fly days`
          : `Departures on ${sortedDays} match their willing-to-fly days`
      );
    } else if (matchingDays.length > 0) {
      // Partial: not all dates align. Hard filter would have rejected on receiver=A side,
      // but for the B-side direction (their wtf vs your offer) this can be partial.
      total += Math.round((matchingDays.length / offer.departureDays.length) * 10);
    } else {
      // Zero overlap: this is a serious mismatch. Cap the direction.
      directionCap = Math.min(directionCap, 45);
    }
  }

  // 5. Equal-hours bonus (max 10)
  if (wants.wantEqualHours && receiverBlockHoursTotal > 0 && offer.totalBlockHours > 0) {
    const diffMinutes = Math.abs(receiverBlockHoursTotal - offer.totalBlockHours) * 60;
    if (diffMinutes <= 30) {
      total += 10;
      reasons.push(
        receiver.label === "you"
          ? "Block hours nearly equal — within 30m of yours"
          : "Block hours nearly equal — within 30m of theirs"
      );
    } else if (diffMinutes <= 90) {
      total += 5;
    }
  }

  // 6. Same-date bonus (max 5) — receiver wants same calendar date and offer aligns
  if (wants.wantSameDate && offer.departureDays.length > 0 && wants.wtfDays.length > 0) {
    const wtfSet = new Set(wants.wtfDays);
    if (offer.departureDays.every((d) => wtfSet.has(d))) {
      total += 5;
    }
  }

  return { total: Math.min(directionCap, Math.max(0, total)), reasons };
}

export function calculateMutualMatchScore(
  viewerActivePost: ViewerActivePostLike,
  candidatePost: PostLike,
  viewerSchedule: ViewerScheduleLike
): MatchScore {
  const reasons: string[] = [];
  const matchingTrips: string[] = [];

  // viewer = A (the user looking), candidate = B (post on the board).
  const offerB = getOfferedTripFingerprints(candidatePost);
  const offerA = getOfferedTripFingerprints(viewerActivePost);

  // Direction 1: does B's offer satisfy A's wants?
  const dirA = scoreOfferAgainstWants(
    { label: "you" },
    offerB,
    {
      wantType: viewerActivePost.wantType,
      wantDestinations: viewerActivePost.wantDestinations,
      wantExclude: viewerActivePost.wantExclude,
      wantMinLayover: viewerActivePost.wantMinLayover,
      wantEqualHours: viewerActivePost.wantEqualHours,
      wantSameDate: viewerActivePost.wantSameDate,
      wtfDays: viewerActivePost.wtfDays,
    },
    offerA.totalBlockHours
  );

  // Direction 2: does A's offer satisfy B's wants?
  const dirB = scoreOfferAgainstWants(
    { label: "they" },
    offerA,
    {
      wantType: candidatePost.wantType,
      wantDestinations: candidatePost.wantDestinations,
      wantExclude: candidatePost.wantExclude,
      wantMinLayover: candidatePost.wantMinLayover,
      wantEqualHours: false,
      wantSameDate: false,
      wtfDays: candidatePost.wtfDays,
    },
    offerB.totalBlockHours
  );

  // Final score: min ensures both sides have to fit.
  // Bonus: if both directions are strong, lift the floor a little.
  const minScore = Math.min(dirA.total, dirB.total);
  const avgScore = (dirA.total + dirB.total) / 2;
  // Combine with a slight pull toward average so a 90/70 doesn't drop straight to 70.
  const total = Math.round(Math.min(100, minScore * 0.7 + avgScore * 0.3));

  reasons.push(...dirA.reasons);
  reasons.push(...dirB.reasons);

  // Track viewer trips that match offered destinations for `matchingTrips`
  const wantedSet = new Set(viewerActivePost.wantDestinations.map((d) => d.toUpperCase()));
  for (const trip of viewerSchedule.trips) {
    const tripDests = getUniqueDestinations(trip).map((d) => d.toUpperCase());
    if (tripDests.some((d) => wantedSet.has(d))) {
      matchingTrips.push(trip.instanceId);
    }
  }

  return {
    total,
    breakdown: {
      wtfDayOverlap: 0,
      destinationMatch: 0,
      blockHoursBalance: 0,
      tripTypeMatch: 0,
      sameDateBonus: 0,
      layoverDuration: 0,
    },
    matchingTrips: Array.from(new Set(matchingTrips)),
    reasons: Array.from(new Set(reasons)),
  };
}
