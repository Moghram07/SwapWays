import { tripRequiresVisa, userHasRequiredVisas } from "@/utils/visaRequirements";

type ViewerLike = {
  id: string;
  baseId: string;
  rankId: string;
  rank: { code: string; category: "CABIN" | "FLIGHT_DECK"; name: string };
  qualifications: { aircraftType: { code: string; scheduleCode: string | null } }[];
  hasUsVisa: boolean;
  hasChinaVisa: boolean;
};

type ScheduleLegLike = {
  departureDate: Date;
  arrivalDate: Date;
  departureAirport: string;
  arrivalAirport: string;
  flightNumber: string;
};

type ViewerScheduleTripLike = { legs: ScheduleLegLike[] };

type PostLike = {
  wantExclude: string[];
  offeredTrips: {
    scheduleTrip: {
      legs: {
        departureDate: Date;
        arrivalDate: Date;
        departureAirport: string;
        arrivalAirport: string;
        aircraftTypeCode: string;
        flightNumber: string;
      }[];
    } | null;
  }[];
};

export interface HardConstraintResult {
  passes: boolean;
  failReason: string | null;
}

export function checkHardConstraints(
  viewer: ViewerLike,
  viewerScheduleTrips: ViewerScheduleTripLike[],
  post: PostLike,
  postOwner: ViewerLike
): HardConstraintResult {
  const baseResult = checkBase(viewer, postOwner);
  if (!baseResult.passes) return baseResult;

  const rankResult = checkRank(viewer, postOwner);
  if (!rankResult.passes) return rankResult;

  const qualResult = checkAircraftQualification(viewer, post);
  if (!qualResult.passes) return qualResult;

  const visaResult = checkVisa(viewer, post);
  if (!visaResult.passes) return visaResult;

  const excludeResult = checkDestinationExclusions(viewerScheduleTrips, post);
  if (!excludeResult.passes) return excludeResult;

  const conflictResult = checkScheduleConflict(viewerScheduleTrips, post);
  if (!conflictResult.passes) return conflictResult;

  return { passes: true, failReason: null };
}

function checkBase(viewer: ViewerLike, postOwner: ViewerLike): HardConstraintResult {
  if (viewer.baseId !== postOwner.baseId) {
    return { passes: false, failReason: "Different base" };
  }
  return { passes: true, failReason: null };
}

function checkRank(viewer: ViewerLike, postOwner: ViewerLike): HardConstraintResult {
  if (viewer.rankId === postOwner.rankId) return { passes: true, failReason: null };
  if (viewer.rank.category !== postOwner.rank.category) {
    return { passes: false, failReason: "Incompatible rank (different crew category)" };
  }
  const compatiblePairs = new Set(["HST:STW", "STW:HST"]);
  const pair = `${viewer.rank.code}:${postOwner.rank.code}`;
  if (!compatiblePairs.has(pair)) {
    return {
      passes: false,
      failReason: `Rank mismatch: ${viewer.rank.name} cannot swap with ${postOwner.rank.name}`,
    };
  }
  return { passes: true, failReason: null };
}

function isDeadHeadFlightNumber(flightNumber: string): boolean {
  return flightNumber.toUpperCase().startsWith("DH");
}

function normalizeAircraftFamily(code: string): string {
  const c = code.toUpperCase();
  if (c.startsWith("77") || c.startsWith("B777")) return "B777";
  if (c.startsWith("78") || c.startsWith("B787")) return "B787";
  if (c.startsWith("33") || c.startsWith("A330")) return "A330";
  if (c === "323" || c.startsWith("A321")) return "A321";
  if (c.startsWith("32") || c.startsWith("A320")) return "A320";
  return c;
}

function checkAircraftQualification(viewer: ViewerLike, post: PostLike): HardConstraintResult {
  const viewerCodes = new Set<string>();
  for (const q of viewer.qualifications) {
    viewerCodes.add(normalizeAircraftFamily(q.aircraftType.code));
    if (q.aircraftType.scheduleCode) viewerCodes.add(normalizeAircraftFamily(q.aircraftType.scheduleCode));
  }
  for (const trip of post.offeredTrips) {
    const legs = trip.scheduleTrip?.legs ?? [];
    for (const leg of legs) {
      if (isDeadHeadFlightNumber(leg.flightNumber)) continue;
      const legFamily = normalizeAircraftFamily(leg.aircraftTypeCode);
      if (!viewerCodes.has(legFamily)) {
        return { passes: false, failReason: `Not qualified on aircraft: ${leg.aircraftTypeCode}` };
      }
    }
  }
  return { passes: true, failReason: null };
}

function checkVisa(viewer: ViewerLike, post: PostLike): HardConstraintResult {
  for (const trip of post.offeredTrips) {
    const legs = trip.scheduleTrip?.legs ?? [];
    if (legs.length === 0) continue;
    const visaReqs = tripRequiresVisa(legs);
    if (!userHasRequiredVisas(viewer, visaReqs)) {
      if (visaReqs.requiresUs && !viewer.hasUsVisa) {
        return { passes: false, failReason: "US visa required for this destination" };
      }
      if (visaReqs.requiresChina && !viewer.hasChinaVisa) {
        return { passes: false, failReason: "China visa required for this destination" };
      }
    }
  }
  return { passes: true, failReason: null };
}

function getTripDestinations(trip: ViewerScheduleTripLike): string[] {
  const base = trip.legs[0]?.departureAirport;
  if (!base) return [];
  const out = new Set<string>();
  for (const leg of trip.legs) {
    if (leg.departureAirport !== base) out.add(leg.departureAirport);
    if (leg.arrivalAirport !== base) out.add(leg.arrivalAirport);
  }
  return Array.from(out);
}

function checkDestinationExclusions(
  viewerScheduleTrips: ViewerScheduleTripLike[],
  post: PostLike
): HardConstraintResult {
  if (post.wantExclude.length === 0) return { passes: true, failReason: null };
  const excluded = new Set(post.wantExclude.map((d) => d.toUpperCase()));
  for (const trip of viewerScheduleTrips) {
    const destinations = getTripDestinations(trip).map((d) => d.toUpperCase());
    const allExcluded = destinations.length > 0 && destinations.every((d) => excluded.has(d));
    if (!allExcluded) return { passes: true, failReason: null };
  }
  return { passes: false, failReason: "All available trips are in excluded destinations" };
}

function dateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
}

function checkScheduleConflict(
  viewerScheduleTrips: ViewerScheduleTripLike[],
  post: PostLike
): HardConstraintResult {
  const viewerDutyDays = new Set<string>();
  for (const trip of viewerScheduleTrips) {
    for (const leg of trip.legs) {
      viewerDutyDays.add(dateKey(leg.departureDate));
      viewerDutyDays.add(dateKey(leg.arrivalDate));
    }
  }

  for (const trip of post.offeredTrips) {
    const legs = trip.scheduleTrip?.legs ?? [];
    for (const leg of legs) {
      const depKey = dateKey(leg.departureDate);
      const arrKey = dateKey(leg.arrivalDate);
      if (viewerDutyDays.has(depKey) || viewerDutyDays.has(arrKey)) {
        return { passes: false, failReason: `Schedule conflict on ${depKey}` };
      }
    }
  }
  return { passes: true, failReason: null };
}
