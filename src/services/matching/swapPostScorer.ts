/**
 * Swap post match scorer — Fit Score × Date Multiplier.
 *
 * Stage 2: Fit Score (0–100) from three factors:
 *   F1 (35): Poster's offered city matches viewer's desired city
 *   F2 (35): Viewer's offered city matches poster's desired city
 *   F3 (30): Trip type compatibility
 *
 * Stage 3: Date Multiplier (×1.0 / ×0.5 / ×0.25) based on whether each
 * side's offered trip date falls on the other's willing-to-fly days.
 * No WTF days set = any date works = that direction automatically passes.
 *
 * Final = round(FitScore × Multiplier), capped at 100.
 */

import type { ViewerSignals } from "./viewerSignalsModel";
import type { PostLike, MatchScore, ScoreBreakdown } from "./softScoring";
import { expandPostWtfToDateKeys } from "./viewerSignalDates";
import { dateKeyUTC } from "./dateMatch";

type TripType = "LAYOVER" | "TURNAROUND" | "MULTI_STOP";

function collectPosterOfferedDestinations(post: PostLike): Set<string> {
  const out = new Set<string>();
  for (const t of post.offeredTrips) out.add(t.destination.toUpperCase());
  for (const d of post.quickDestinations ?? []) out.add(d.toUpperCase());
  return out;
}

function collectPosterOfferedTripTypes(post: PostLike): Set<TripType> {
  const out = new Set<TripType>();
  for (const t of post.offeredTrips) out.add(t.tripType);
  if (post.quickTripType) out.add(post.quickTripType);
  return out;
}

function isPosterOpen(wantType: string): boolean {
  return wantType === "ANYTHING" || wantType === "ANY_FLIGHT" || wantType === "DAYS_OFF";
}

function computeFitScore(
  signals: ViewerSignals,
  post: PostLike
): { score: number; reasons: string[]; f1: number; f2: number; f3: number } {
  const reasons: string[] = [];
  const posterOffered = collectPosterOfferedDestinations(post);
  const posterWanted = new Set(post.wantDestinations.map((d) => d.toUpperCase()));
  const posterOpen = isPosterOpen(post.wantType);
  const viewerWanted = new Set(signals.wantedDestinations);

  // F1 — Poster's offered city matches viewer's desired city
  let f1 = 0;
  if (viewerWanted.size > 0 && [...posterOffered].some((d) => viewerWanted.has(d))) {
    f1 = 35;
    reasons.push("They offer a destination you want");
  } else if (signals.hasAnyDestinationFlex) {
    f1 = 25;
    reasons.push("You are open to their destination");
  }

  // F2 — Viewer's offered city matches poster's desired city
  let f2 = 0;
  if (posterWanted.size > 0 && signals.offeredDestinations.some((d) => posterWanted.has(d))) {
    f2 = 35;
    reasons.push("You offer a destination they want");
  } else if (posterOpen) {
    f2 = 25;
    reasons.push("They are flexible on destination");
  }

  // F3 — Trip type compatibility
  // Map viewer's WantType values to actual TripTypes they'd accept
  const viewerWantedTripTypes = new Set<TripType>();
  for (const w of signals.wantTypes) {
    if (w === "LAYOVER" || w === "LONGER_LAYOVER") viewerWantedTripTypes.add("LAYOVER");
    else if (w === "ROUND_TRIP") viewerWantedTripTypes.add("TURNAROUND");
  }
  const posterTypes = collectPosterOfferedTripTypes(post);
  let f3 = 0;
  if (viewerWantedTripTypes.size > 0 && posterTypes.size > 0) {
    // Viewer has an explicit trip type preference — only award points if it matches
    const typesMatch = [...posterTypes].some((t) => viewerWantedTripTypes.has(t));
    if (typesMatch) {
      f3 = 30;
      reasons.push("Same trip type");
    }
    // else: explicit mismatch → f3 = 0, no reason added
  } else if (signals.hasAnyDestinationFlex) {
    // Viewer accepts any trip type (wantType = ANYTHING / ANY_FLIGHT)
    if (posterTypes.size > 0) {
      f3 = 30;
      reasons.push("Open to any trip type");
    } else {
      f3 = 18;
      reasons.push("Flexible trip preferences");
    }
  } else if (posterOpen) {
    // No viewer type constraint and poster is flexible → partial
    f3 = 18;
    reasons.push("Flexible trip preferences");
  }

  return { score: f1 + f2 + f3, reasons, f1, f2, f3 };
}

function computeDateMultiplier(
  signals: ViewerSignals,
  post: PostLike
): { multiplier: number; reasons: string[] } {
  const reasons: string[] = [];

  // Direction A: Does poster's trip date fall on viewer's WTF days?
  let dirA: boolean;
  if (!signals.hasExplicitWtfFromPosts || signals.wtfDateKeys.size === 0) {
    // Viewer has no WTF constraint → any date works for them
    dirA = true;
  } else {
    const posterDateKeys: string[] = [];
    for (const t of post.offeredTrips) posterDateKeys.push(dateKeyUTC(t.departureDate));
    if (post.quickDate) posterDateKeys.push(dateKeyUTC(post.quickDate));
    dirA = posterDateKeys.some((k) => signals.wtfDateKeys.has(k));
    if (dirA) reasons.push("Their trip date matches your willing-to-fly days");
  }

  // Direction B: Does viewer's offered date fall on poster's WTF days?
  let dirB: boolean;
  if (post.wtfDays.length === 0) {
    // Poster has no WTF constraint → any date works for them
    dirB = true;
  } else {
    const posterWtfKeys = expandPostWtfToDateKeys(post);
    dirB = [...signals.offeredDateKeys].some((k) => posterWtfKeys.has(k));
    if (dirB) reasons.push("Your offered date matches their willing-to-fly days");
  }

  const multiplier = dirA && dirB ? 1.0 : dirA || dirB ? 0.5 : 0.25;

  if (!dirA && !dirB) {
    reasons.push("Dates don't align with either side's willing-to-fly days");
  } else if (!dirA) {
    reasons.push("Partial date alignment — their trip isn't on your willing-to-fly days");
  } else if (!dirB) {
    reasons.push("Partial date alignment — your trip isn't on their willing-to-fly days");
  }

  return { multiplier, reasons };
}

function emptyBreakdown(): ScoreBreakdown {
  return {
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
}

export function scoreSwapPost(
  signals: ViewerSignals,
  post: PostLike,
  _primaryYear: number,
  _primaryMonth: number,
): MatchScore {
  const fitResult = computeFitScore(signals, post);
  const dateResult = computeDateMultiplier(signals, post);

  const total = Math.min(100, Math.round(fitResult.score * dateResult.multiplier));

  const breakdown: ScoreBreakdown = {
    ...emptyBreakdown(),
    destinationMatch: fitResult.f1,
    mutualSwap: fitResult.f2,
    tripTypeMatch: fitResult.f3,
    dateAlignment: Math.round(dateResult.multiplier * 100),
  };

  return {
    total,
    breakdown,
    matchingTrips: [],
    reasons: [...new Set([...fitResult.reasons, ...dateResult.reasons])],
  };
}
