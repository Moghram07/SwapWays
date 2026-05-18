import { getServerSession } from "next-auth";
import { NextResponse, after } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  createSwapPost,
  findActiveSwapPostsByUserId,
  findHistorySwapPostsByUserId,
  getOpenOfferingDedupeInfoForUser,
} from "@/repositories/swapPostRepository";
import {
  hasDuplicateAmongFingerprints,
  looseManualMultiStopPostKeyFromTrips,
  looseSimpleTripKey,
  offeredTripFingerprintFromCandidate,
} from "@/lib/swapPostOfferDedupe";
import { prisma } from "@/lib/prisma";
import { classifyTrip, getUniqueDestinations } from "@/utils/tripClassifier";
import {
  findMatchesForPost,
  invalidateMatchCacheForPosts,
  invalidateMatchCacheForViewer,
} from "@/services/matching/matchEngine";
import { createNotification } from "@/lib/notifications";
import { isSwapPostExpired } from "@/lib/swapExpiry";
import { trackEventServer } from "@/lib/analytics/server";
import { MAX_TRIPS_PER_POST, MIN_TRIPS_PER_POST } from "@/constants/swapPost";
import { getPremiumViewerIds, getUserAccess } from "@/utils/featureGates";
import { HIGH_MATCH_NOTIFICATION_MIN_PERCENT } from "@/constants/subscription";
import { withTiming } from "@/lib/apiTimer";
import { getVacationSwapYearRange, isAllowedVacationSwapYear } from "@/lib/vacationSwapYearBounds";
import { normalizeWantAcceptanceOptions } from "@/lib/wantAcceptanceOptions";

function normalizeFlightNumber(raw: string | null | undefined): string | null {
  let s = (raw ?? "").trim().toUpperCase();
  if (!s) return null;
  if (s.startsWith("SV")) s = s.slice(2);
  else if (s.startsWith("DH")) s = s.slice(2);
  return s || null;
}

function unauthorized() {
  return NextResponse.json(
    { data: null, error: "Unauthorized", message: "Please sign in" },
    { status: 401 }
  );
}

function error(message: string, status: number) {
  return NextResponse.json({ data: null, error: "Error", message }, { status });
}

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

function normalizeAirportCodes(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((s) => String(s).trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeReportTime(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(".", ":").replace(/Z$/i, "");
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(normalized) ? normalized : null;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function getVacationMonthStart(year: number | undefined, month: number | undefined): Date | null {
  if (!year || !month || month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
}

type ManualOfferedTrip = {
  tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
  destination: string;
  destinations: string[];
  departureDate: Date;
  layoverHours: number | null;
  reportTime: string | null;
  aircraftType: string | null;
  blockHours: number | null;
  flightNumber: string | null;
  legLayovers?: { legIndex: number; layoverHours: number }[];
};

function normalizeManualOfferedTrips(
  offeredTrips: unknown
): { trips: ManualOfferedTrip[]; errorMessage?: string } {
  if (!Array.isArray(offeredTrips)) return { trips: [] };
  if (offeredTrips.length < MIN_TRIPS_PER_POST) {
    return { trips: [], errorMessage: "At least one trip is required" };
  }
  if (offeredTrips.length > MAX_TRIPS_PER_POST) {
    return { trips: [], errorMessage: `Maximum ${MAX_TRIPS_PER_POST} trips per post` };
  }

  const out: ManualOfferedTrip[] = [];
  for (const raw of offeredTrips) {
    if (!raw || typeof raw !== "object") return { trips: [], errorMessage: "Invalid offered trip payload" };
    const trip = raw as {
      tripType?: "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
      destination?: string;
      destinations?: string[];
      date?: string;
      layoverHours?: number | null;
      reportTime?: string | null;
      aircraftTypeCode?: string | null;
      blockHours?: number | null;
      flightNumber?: string | null;
      legs?: { to: string; hasLayover: boolean; layoverHours: number | null }[];
    };
    if (!trip.tripType || !trip.date) {
      return { trips: [], errorMessage: "Each offered trip requires tripType and date" };
    }

    // Derive destinations and legLayovers from legs array
    const isPairing = trip.tripType === "MULTI_STOP";
    // New form always sends legs (all types); old pairing format may also send legs
    const hasLegs = Array.isArray(trip.legs) && trip.legs.length >= 2;
    let destinations: string[];
    let legLayovers: { legIndex: number; layoverHours: number }[] | undefined;

    if (hasLegs) {
      // New form: legs include the final return leg — exclude it for stored destinations
      const interimLegs = trip.legs!.slice(0, -1);
      destinations = interimLegs.map((l) => String(l.to ?? "").trim().toUpperCase()).filter(Boolean);
      legLayovers = interimLegs
        .map((l, i) => ({ legIndex: i, hasLayover: l.hasLayover, layoverHours: l.layoverHours }))
        .filter((l) => l.hasLayover && l.layoverHours != null && l.layoverHours > 0)
        .map((l) => ({ legIndex: l.legIndex, layoverHours: l.layoverHours! }));
    } else if (isPairing && Array.isArray(trip.legs) && trip.legs.length > 0) {
      // Legacy pairing format (no final return leg)
      destinations = trip.legs.map((l) => String(l.to ?? "").trim().toUpperCase()).filter(Boolean);
      legLayovers = trip.legs
        .map((l, i) => ({ legIndex: i, hasLayover: l.hasLayover, layoverHours: l.layoverHours }))
        .filter((l) => l.hasLayover && l.layoverHours != null && l.layoverHours > 0)
        .map((l) => ({ legIndex: l.legIndex, layoverHours: l.layoverHours! }));
    } else {
      destinations = normalizeAirportCodes(trip.destinations);
    }

    const singleDestination = String(trip.destination ?? "").trim().toUpperCase();
    if (isPairing && !hasLegs) {
      if (destinations.length < 1) {
        return { trips: [], errorMessage: "Pairing trips need at least one intermediate stop" };
      }
    } else if (!isPairing && !hasLegs && !singleDestination) {
      return { trips: [], errorMessage: "Each non-pairing trip needs a destination" };
    }
    if (trip.tripType === "LAYOVER" && !(Number(trip.layoverHours) > 0)) {
      return { trips: [], errorMessage: "Layover trips need a duration" };
    }
    const reportTime = normalizeReportTime(trip.reportTime);
    if (!reportTime) {
      return { trips: [], errorMessage: "Each offered trip needs report time in HH:MM format" };
    }

    const primaryLayoverHours =
      trip.tripType === "LAYOVER"
        ? Number(trip.layoverHours)
        : null;

    // For new-form submissions with legs, derive destination from the leg data
    const resolvedDestination = hasLegs
      ? (singleDestination || (destinations[0] ?? ""))
      : (isPairing ? (destinations[0] ?? "") : singleDestination);
    const resolvedDestinations = hasLegs ? destinations : (isPairing ? destinations : [singleDestination]);

    out.push({
      tripType: trip.tripType,
      destination: resolvedDestination,
      destinations: resolvedDestinations,
      departureDate: new Date(`${trip.date}T00:00:00.000Z`),
      layoverHours: primaryLayoverHours,
      reportTime,
      aircraftType: trip.aircraftTypeCode?.trim() ? trip.aircraftTypeCode.trim().toUpperCase() : null,
      blockHours: trip.blockHours != null ? Number(trip.blockHours) : null,
      flightNumber: trip.flightNumber?.trim() ? normalizeFlightNumber(trip.flightNumber) : null,
      legLayovers,
    });
  }
  return { trips: out };
}

export async function GET(request: Request) {
  const timer = withTiming("GET /api/swap-posts");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return timer.end(unauthorized());
  const { searchParams } = new URL(request.url);
  if (searchParams.get("mine") !== "1") {
    return timer.end(error("Use ?mine=1 to fetch your swap posts", 400));
  }
  const scope = searchParams.get("scope") ?? "active";
  if (scope !== "active" && scope !== "history") {
    return timer.end(error("Use scope=active or scope=history", 400));
  }
  try {
    const now = new Date();
    if (scope === "history") {
      const posts = await findHistorySwapPostsByUserId(session.user.id);
      return timer.end(json(posts));
    }
    const posts = await findActiveSwapPostsByUserId(session.user.id);
    return timer.end(json(posts.filter((post) => !isSwapPostExpired(post, now))));
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : null;
    if (code === "P2021") {
      console.error("[swap-posts GET] Database table missing.");
      return timer.end(NextResponse.json(
        { data: null, error: "ServerConfig", message: "Not available. Please try again later." },
        { status: 503 }
      ));
    }
    console.error("[swap-posts GET]", err);
    return timer.end(NextResponse.json(
      { data: null, error: "ServerError", message: "Failed to load your posts." },
      { status: 500 }
    ));
  }
}

export async function POST(request: Request) {
  const timer = withTiming("POST /api/swap-posts");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return timer.end(unauthorized());

  // Parallelize: user access check + base airport lookup + body parse
  let body: {
    postType?: string;
    selectedTrips?: string[];
    selectedDaysOff?: number[];
    wantCriteria?: {
      wantType: string;
      wantTripTypes?: string[];
      wantMinLayover?: number | null;
      wantMinCredit?: number | null;
      wantMaxCredit?: number | null;
      wantEqualHours?: boolean;
      wantSameDate?: boolean;
      wantDestinations?: string[];
      wantExclude?: string[];
      /** Explicit “Anything” for want destinations (stored as empty wantDestinations). */
      wantOpenToAnyDestination?: boolean;
      wtfDays?: number[];
      wantDaysOff?: boolean;
      notes?: string;
      wantAcceptanceOptions?: unknown[];
    };
    vacationStartDate?: string;
    vacationEndDate?: string;
    desiredVacationStart?: string;
    desiredVacationEnd?: string;
    vacationYear?: number;
    vacationMonth?: number;
    vacationStartDay?: number;
    vacationEndDay?: number;
    desiredVacationMonths?: number[];
    source?: "MANUAL_QUICK" | "SCHEDULE_PREFILL";
    offeredTrips?: {
      tripType?: "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
      destination?: string;
      destinations?: string[];
      date?: string;
      layoverHours?: number | null;
      reportTime?: string | null;
      aircraftTypeCode?: string | null;
      blockHours?: number | null;
      flightNumber?: string | null;
      legs?: { to: string; hasLayover: boolean; layoverHours: number | null }[];
    }[];
    quickTrip?: {
      tripType?: "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
      destinations?: string[];
      date?: string;
      layoverHours?: number | null;
    };
    advanced?: {
      reportTime?: string | null;
      aircraftTypeCode?: string | null;
      blockHours?: number | null;
      flightNumber?: string | null;
    };
  };
  let access: Awaited<ReturnType<typeof getUserAccess>>;
  let userBaseCode: string | null;
  try {
    const [bodyRaw, accessResult, userBaseRow] = await Promise.all([
      request.json(),
      getUserAccess(session.user.id),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { base: { select: { airportCode: true } } },
      }),
    ]);
    body = bodyRaw;
    access = accessResult;
    userBaseCode = userBaseRow?.base?.airportCode?.toUpperCase() ?? null;
  } catch {
    return timer.end(error("Invalid JSON", 400));
  }

  const postType = body.postType as "OFFERING_TRIPS" | "VACATION_SWAP" | undefined;
  const validTypes = ["OFFERING_TRIPS", "VACATION_SWAP"];
  if (!postType || !validTypes.includes(postType)) {
    return timer.end(error("postType is required and must be one of: " + validTypes.join(", "), 400));
  }
  if (postType === "VACATION_SWAP") {
    const year = body.vacationYear != null ? Number(body.vacationYear) : NaN;
    const month = body.vacationMonth != null ? Number(body.vacationMonth) : NaN;
    const desiredMonths = Array.isArray(body.desiredVacationMonths)
      ? body.desiredVacationMonths.map((m: unknown) => Number(m)).filter((m: number) => m >= 1 && m <= 12)
      : [];
    if (!Number.isInteger(year) || !isAllowedVacationSwapYear(year)) {
      const { min, max } = getVacationSwapYearRange();
      return error(`Vacation swap requires vacationYear (${min} or ${max})`, 400);
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return error("Vacation swap requires vacationMonth (1–12)", 400);
    }
    if (desiredMonths.length === 0) {
      return error("Vacation swap requires at least one desiredVacationMonth (1–12)", 400);
    }
    const startDay = body.vacationStartDay != null ? Number(body.vacationStartDay) : null;
    const endDay = body.vacationEndDay != null ? Number(body.vacationEndDay) : null;
    if (startDay != null && (!Number.isInteger(startDay) || startDay < 1 || startDay > 31)) {
      return error("vacationStartDay must be 1–31", 400);
    }
    if (endDay != null && (!Number.isInteger(endDay) || endDay < 1 || endDay > 31)) {
      return error("vacationEndDay must be 1–31", 400);
    }
    if (startDay != null && endDay != null && startDay > endDay) {
      return error("vacationStartDay must be less than or equal to vacationEndDay", 400);
    }
  }

  const wantCriteria = body.wantCriteria;
  if (!wantCriteria || typeof wantCriteria.wantType !== "string") {
    return error("wantCriteria.wantType is required", 400);
  }

  const selectedTrips = Array.isArray(body.selectedTrips) ? body.selectedTrips : [];
  if (selectedTrips.length > MAX_TRIPS_PER_POST) {
    return error(`Maximum ${MAX_TRIPS_PER_POST} trips per post`, 400);
  }
  const selectedDaysOff = Array.isArray(body.selectedDaysOff) ? body.selectedDaysOff : [];
  const normalizedManualTrips = normalizeManualOfferedTrips(body.offeredTrips);
  if (normalizedManualTrips.errorMessage) {
    return error(normalizedManualTrips.errorMessage, 400);
  }

  // Backward compatibility for legacy single quick trip payload.
  if (normalizedManualTrips.trips.length === 0 && body.quickTrip?.tripType && body.quickTrip?.date) {
    const fallback = normalizeManualOfferedTrips([
      {
        tripType: body.quickTrip.tripType,
        destination: body.quickTrip.destinations?.[0],
        destinations: body.quickTrip.destinations,
        date: body.quickTrip.date,
        layoverHours: body.quickTrip.layoverHours ?? null,
        reportTime: body.advanced?.reportTime ?? null,
        aircraftTypeCode: body.advanced?.aircraftTypeCode ?? null,
        blockHours: body.advanced?.blockHours ?? null,
        flightNumber: body.advanced?.flightNumber ?? null,
      },
    ]);
    if (fallback.errorMessage) return error(fallback.errorMessage, 400);
    normalizedManualTrips.trips = fallback.trips;
  }

  // Strip the user's own base airport from offered destinations — it can never be a valid swap destination.
  if (userBaseCode) {
    for (const trip of normalizedManualTrips.trips) {
      trip.destinations = trip.destinations.filter((d) => d.toUpperCase() !== userBaseCode);
      if (trip.destination?.toUpperCase() === userBaseCode) {
        trip.destination = trip.destinations[0] ?? "";
      }
    }
  }

  if (postType === "OFFERING_TRIPS" && selectedTrips.length === 0 && normalizedManualTrips.trips.length === 0) {
    return error("Flight Swap requires selectedTrips or offeredTrips data", 400);
  }

  const acceptanceRes = normalizeWantAcceptanceOptions(wantCriteria.wantAcceptanceOptions);
  if (!acceptanceRes.ok) {
    return error(acceptanceRes.message, 400);
  }

  const wantOpenToAnyDestination =
    wantCriteria.wantOpenToAnyDestination === true || wantCriteria.wantType === "ANYTHING";
  const normalizedWantDestinations = wantOpenToAnyDestination
    ? []
    : normalizeAirportCodes(wantCriteria.wantDestinations);
  const normalizedWantExclude = normalizeAirportCodes(wantCriteria.wantExclude);
  const wtfDaysRaw = Array.isArray(wantCriteria.wtfDays) ? wantCriteria.wtfDays : [];
  const normalizedWtfDays = wtfDaysRaw
    .map((d) => Number(d))
    .filter((d) => Number.isInteger(d) && d >= 1 && d <= 31);

  const criteria = {
    wantType: wantCriteria.wantType as "LAYOVER" | "LONGER_LAYOVER" | "ROUND_TRIP" | "ANY_FLIGHT" | "DAYS_OFF" | "ANYTHING" | "SPECIFIC",
    wantTripTypes: (wantCriteria.wantTripTypes ?? []) as ("LAYOVER" | "TURNAROUND" | "MULTI_STOP")[],
    wantMinLayover: wantCriteria.wantMinLayover ?? null,
    wantMinCredit: wantCriteria.wantMinCredit ?? null,
    wantMaxCredit: wantCriteria.wantMaxCredit ?? null,
    wantEqualHours: wantCriteria.wantEqualHours ?? false,
    wantSameDate: wantCriteria.wantSameDate ?? false,
    wantDestinations: normalizedWantDestinations,
    wantExclude: normalizedWantExclude,
    wantAcceptanceOptions: acceptanceRes.value ? acceptanceRes.value : [],
    wtfDays: normalizedWtfDays,
    wantDaysOff: wantCriteria.wantDaysOff ?? false,
    notes: wantCriteria.notes ?? "",
  };
  if (criteria.wantType === "DAYS_OFF" && criteria.wtfDays.length === 0) {
    return error("wantCriteria.wtfDays is required when wantType is DAYS_OFF", 400);
  }
  if (criteria.wantType === "DAYS_OFF" && selectedDaysOff.length === 0) {
    return error("selectedDaysOff is required when wantType is DAYS_OFF", 400);
  }

  if (postType === "OFFERING_TRIPS") {
    if (criteria.wtfDays.length === 0) {
      return error("Choose at least one willing-to-fly day (WTF)", 400);
    }
    if (criteria.wantType !== "DAYS_OFF") {
      if (!wantOpenToAnyDestination && criteria.wantDestinations.length === 0) {
        return error("Choose want destinations or Anything", 400);
      }
      if (wantOpenToAnyDestination && normalizedWantDestinations.length > 0) {
        return error("Cannot combine Anything with specific want destinations", 400);
      }
    }
  }

  const swapPostTrips: {
    scheduleTripId?: string | null;
    flightNumber?: string | null;
    destination: string;
    destinations?: string[];
    departureDate: Date;
    tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
    creditHours?: number | null;
    tafb?: number | null;
    reportTime?: string | null;
    aircraftType?: string | null;
    blockHours?: number | null;
    hasLayover: boolean;
    layoverCity: string | null;
    layoverHours: number | null;
    legLayovers?: { legIndex: number; layoverHours: number }[];
    isManualEntry?: boolean;
  }[] = [];

  try {
    // Fetch schedule trips and deduplication fingerprints in parallel
    const [scheduledTripsRaw, dedupeInfo] = await Promise.all([
      selectedTrips.length > 0
        ? prisma.scheduleTrip.findMany({
            where: { id: { in: selectedTrips }, schedule: { userId: session.user.id } },
            select: {
              id: true,
              tripNumber: true,
              startDate: true,
              creditHours: true,
              blockHours: true,
              tafb: true,
              reportTime: true,
              legs: {
                orderBy: { legOrder: "asc" },
                select: { legOrder: true, flightNumber: true, aircraftTypeCode: true, departureAirport: true, arrivalAirport: true },
              },
              layovers: {
                orderBy: { afterLegOrder: "asc" },
                select: { airport: true, durationDecimal: true },
              },
            },
          })
        : Promise.resolve([]),
      postType === "OFFERING_TRIPS"
        ? getOpenOfferingDedupeInfoForUser(session.user.id)
        : Promise.resolve(null),
    ]);

    if (selectedTrips.length > 0) {
      for (const trip of scheduledTripsRaw) {
        const tripType = classifyTrip(trip);
        const destinations = getUniqueDestinations(trip);
        const destination = destinations[0] ?? trip.legs[trip.legs.length - 1]?.arrivalAirport ?? "";
        const firstLeg = trip.legs[0];
        const hasLayover = trip.layovers.length > 0;
        const layover = trip.layovers[0];

        swapPostTrips.push({
          scheduleTripId: trip.id,
          flightNumber: normalizeFlightNumber(firstLeg?.flightNumber),
          destination,
          destinations,
          departureDate: trip.startDate,
          tripType,
          creditHours: trip.creditHours,
          tafb: trip.tafb,
          reportTime: trip.reportTime ?? null,
          aircraftType: firstLeg?.aircraftTypeCode ?? null,
          blockHours: trip.blockHours ?? null,
          hasLayover,
          layoverCity: hasLayover && layover ? layover.airport : null,
          layoverHours: hasLayover && layover ? layover.durationDecimal : null,
          isManualEntry: false,
        });
      }
      if (postType === "OFFERING_TRIPS" && swapPostTrips.length === 0) {
        return error("Selected trips were not found in your schedule", 400);
      }
    } else if (normalizedManualTrips.trips.length > 0) {
      for (const trip of normalizedManualTrips.trips) {
        swapPostTrips.push({
          scheduleTripId: null,
          flightNumber: trip.flightNumber ?? null,
          destination: trip.destination,
          destinations: trip.destinations,
          departureDate: trip.departureDate,
          tripType: trip.tripType,
          creditHours: trip.blockHours ?? 0,
          tafb: null,
          reportTime: trip.reportTime,
          aircraftType: trip.aircraftType,
          blockHours: trip.blockHours,
          hasLayover: trip.tripType === "LAYOVER",
          layoverCity: trip.tripType === "LAYOVER" ? trip.destination : (trip.legLayovers?.[0] != null ? trip.destinations[trip.legLayovers[0].legIndex] ?? null : null),
          layoverHours: trip.layoverHours,
          legLayovers: trip.legLayovers,
          isManualEntry: true,
        });
      }
    }

    if (postType === "OFFERING_TRIPS" && swapPostTrips.length > 0 && dedupeInfo) {
      const { tripFingerprints, looseManualMultiStopKeys, looseSimpleTripKeys } = dedupeInfo;
      const candidates = swapPostTrips.map((row) =>
        offeredTripFingerprintFromCandidate({
          scheduleTripId: row.scheduleTripId,
          departureDate: row.departureDate,
          tripType: row.tripType,
          reportTime: row.reportTime,
          destinations: row.destinations,
          destination: row.destination,
          flightNumber: row.flightNumber,
          layoverHours: row.layoverHours,
        })
      );
      if (hasDuplicateAmongFingerprints(candidates, tripFingerprints)) {
        return error("One of these trips is already in another open post. Cancel that post first.", 400);
      }
      const looseNew = looseManualMultiStopPostKeyFromTrips(
        swapPostTrips.map((row) => ({
          scheduleTripId: row.scheduleTripId ?? null,
          tripType: row.tripType,
          departureDate: row.departureDate,
          destinations: row.destinations ?? [],
          destination: row.destination,
        }))
      );
      if (looseNew && looseManualMultiStopKeys.has(looseNew)) {
        return error("One of these trips is already in another open post. Cancel that post first.", 400);
      }
      const looseSimpleNew = swapPostTrips
        .map((row) => looseSimpleTripKey({
          scheduleTripId: row.scheduleTripId ?? null,
          tripType: row.tripType,
          departureDate: row.departureDate,
          destinations: row.destinations ?? [],
          destination: row.destination,
        }))
        .filter((k): k is string => k !== null);
      if (looseSimpleNew.some((k) => looseSimpleTripKeys.has(k))) {
        return error("Trip was already posted. You can edit your swaps from My Swaps.", 400);
      }
    }

    const vacationStartDate = postType === "VACATION_SWAP" && body.vacationStartDate ? new Date(body.vacationStartDate) : undefined;
    const vacationEndDate = postType === "VACATION_SWAP" && body.vacationEndDate ? new Date(body.vacationEndDate) : undefined;
    const desiredVacationStart = postType === "VACATION_SWAP" && body.desiredVacationStart ? new Date(body.desiredVacationStart) : undefined;
    const desiredVacationEnd = postType === "VACATION_SWAP" && body.desiredVacationEnd ? new Date(body.desiredVacationEnd) : undefined;

    const vacationYear = postType === "VACATION_SWAP" && body.vacationYear != null ? Number(body.vacationYear) : undefined;
    const vacationMonth = postType === "VACATION_SWAP" && body.vacationMonth != null ? Number(body.vacationMonth) : undefined;
    const vacationStartDay = postType === "VACATION_SWAP" && body.vacationStartDay != null ? Number(body.vacationStartDay) : undefined;
    const vacationEndDay = postType === "VACATION_SWAP" && body.vacationEndDay != null ? Number(body.vacationEndDay) : undefined;
    const desiredVacationMonths = postType === "VACATION_SWAP" && Array.isArray(body.desiredVacationMonths)
      ? (body.desiredVacationMonths as number[]).map((m) => Number(m)).filter((m) => m >= 1 && m <= 12)
      : undefined;

    const now = new Date();
    const expiresAt = (() => {
      if (access.tier === "FREE") return addDays(now, 7);
      if (postType === "VACATION_SWAP") {
        return (
          getVacationMonthStart(vacationYear ?? undefined, vacationMonth ?? undefined) ??
          vacationStartDate ??
          null
        );
      }
      if (swapPostTrips.length > 0) {
        const earliestTripDate = swapPostTrips.reduce<Date | null>((earliest, trip) => {
          if (!earliest) return trip.departureDate;
          return trip.departureDate.getTime() < earliest.getTime() ? trip.departureDate : earliest;
        }, null);
        return earliestTripDate;
      }
      return null;
    })();

    const post = await createSwapPost(session.user.id, {
      postType,
      offeringDaysOff: false,
      offeredDaysOff: selectedDaysOff,
      wantCriteria: criteria,
      swapPostTrips,
      source: selectedTrips.length > 0 ? "SCHEDULE_PREFILL" : "MANUAL_QUICK",
      quickTrip:
        normalizedManualTrips.trips.length > 0
          ? {
              tripType: normalizedManualTrips.trips[0].tripType,
              destinations: normalizedManualTrips.trips[0].destinations,
              date: normalizedManualTrips.trips[0].departureDate.toISOString().slice(0, 10),
              layoverHours: normalizedManualTrips.trips[0].layoverHours,
            }
          : undefined,
      advanced:
        normalizedManualTrips.trips.length > 0
          ? {
              reportTime: normalizedManualTrips.trips[0].reportTime,
              aircraftTypeCode: normalizedManualTrips.trips[0].aircraftType,
              blockHours: normalizedManualTrips.trips[0].blockHours,
              flightNumber: normalizedManualTrips.trips[0].flightNumber,
            }
          : undefined,
      vacationStartDate: vacationStartDate ?? null,
      vacationEndDate: vacationEndDate ?? null,
      desiredVacationStart: desiredVacationStart ?? null,
      desiredVacationEnd: desiredVacationEnd ?? null,
      vacationYear: vacationYear ?? null,
      vacationMonth: vacationMonth ?? null,
      vacationStartDay: vacationStartDay ?? null,
      vacationEndDay: vacationEndDay ?? null,
      desiredVacationMonths: desiredVacationMonths ?? [],
      expiresAt,
    });

    // Return immediately — matching, notifications, and cache run after the response is sent.
    const postId = post.id;
    const viewerId = session.user.id;
    const hasAdvanced = normalizedManualTrips.trips.some(
      (trip) => trip.reportTime || trip.aircraftType || trip.blockHours || trip.flightNumber
    );
    after(async () => {
      try {
        const matches = await findMatchesForPost(postId);
        const highMatches = matches.filter((m) => m.matchPercent >= HIGH_MATCH_NOTIFICATION_MIN_PERCENT).slice(0, 10);
        const premiumViewerIds = await getPremiumViewerIds(highMatches.map((m) => m.viewerId));
        await Promise.all(
          highMatches.map((m) => {
            if (!premiumViewerIds.has(m.viewerId)) return Promise.resolve();
            return createNotification({
              userId: m.viewerId,
              type: "MATCH_FOUND",
              title: "New match found",
              message: `A new swap post matches your profile (${Math.round(m.matchPercent)}%).`,
              data: { postId: m.postId, matchPercent: m.matchPercent, failReason: m.failReason },
            });
          })
        );
      } catch (matchErr) {
        console.error("[swap-posts] post-created matching failed", matchErr);
      }
      await trackEventServer({
        eventName: "swap_post_created",
        userId: viewerId,
        path: "/dashboard/add-trade",
        properties: { postType, source: selectedTrips.length > 0 ? "SCHEDULE_PREFILL" : "MANUAL_QUICK", hasAdvanced },
      }).catch(() => {});
      await invalidateMatchCacheForPosts([postId]).catch(() => {});
      await invalidateMatchCacheForViewer(viewerId).catch(() => {});
    });

    return timer.end(json(post));
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : null;
    if (code === "P2021") {
      console.error("[swap-posts] Database table missing. Run: npx prisma db push");
      return timer.end(NextResponse.json(
        { data: null, error: "ServerConfig", message: "Posting is not available right now. Please try again later." },
        { status: 503 }
      ));
    }
    if (code === "P2022") {
      console.error("[swap-posts] Unknown column — schema not applied. Run: npx prisma db push");
      return timer.end(NextResponse.json(
        { data: null, error: "ServerConfig", message: "Posting is not available right now. Please try again later." },
        { status: 503 }
      ));
    }
    console.error("[swap-posts]", err);
    return timer.end(NextResponse.json(
      { data: null, error: "ServerError", message: "Failed to create post. Please try again." },
      { status: 500 }
    ));
  }
}
