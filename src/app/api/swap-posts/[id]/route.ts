import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  findSwapPostById,
  getOpenOfferingDedupeInfoForUser,
  updateSwapPost,
} from "@/repositories/swapPostRepository";
import {
  hasDuplicateAmongFingerprints,
  looseManualMultiStopPostKeyFromTrips,
  offeredTripFingerprintFromCandidate,
} from "@/lib/swapPostOfferDedupe";
import { prisma } from "@/lib/prisma";
import { classifyTrip, getUniqueDestinations } from "@/utils/tripClassifier";
import { trackEventServer } from "@/lib/analytics/server";
import {
  invalidateMatchCacheForPosts,
  invalidateMatchCacheForViewer,
} from "@/services/matching/matchEngine";
import { MAX_TRIPS_PER_POST, MIN_TRIPS_PER_POST } from "@/constants/swapPost";
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
    const isPairing = trip.tripType === "MULTI_STOP";
    let destinations: string[];
    let legLayovers: { legIndex: number; layoverHours: number }[] | undefined;
    if (isPairing && Array.isArray(trip.legs) && trip.legs.length > 0) {
      destinations = trip.legs.map((l) => String(l.to ?? "").trim().toUpperCase()).filter(Boolean);
      legLayovers = trip.legs
        .map((l, i) => ({ legIndex: i, hasLayover: l.hasLayover, layoverHours: l.layoverHours }))
        .filter((l) => l.hasLayover && l.layoverHours != null && l.layoverHours > 0)
        .map((l) => ({ legIndex: l.legIndex, layoverHours: l.layoverHours! }));
    } else {
      destinations = normalizeAirportCodes(trip.destinations);
    }
    const singleDestination = String(trip.destination ?? "").trim().toUpperCase();
    if (isPairing) {
      if (destinations.length < 1) return { trips: [], errorMessage: "Pairing trips need at least one intermediate stop" };
    } else if (!singleDestination) {
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
    out.push({
      tripType: trip.tripType,
      destination: isPairing ? destinations[0] ?? "" : singleDestination,
      destinations: isPairing ? destinations : [singleDestination],
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;

  try {
    const post = await findSwapPostById(id);
    if (!post) return error("Not found", 404);
    if (post.userId !== session.user.id) return error("Unauthorized", 403);
    return json(post);
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : null;
    if (code === "P2021") {
      return NextResponse.json(
        { data: null, error: "ServerConfig", message: "Not available. Please try again later." },
        { status: 503 }
      );
    }
    console.error("[swap-posts GET id]", err);
    return NextResponse.json(
      { data: null, error: "ServerError", message: "Failed to load post." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;

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
      wantOpenToAnyDestination?: boolean;
      wtfDays?: number[];
      wantDaysOff?: boolean;
      notes?: string;
      wantAcceptanceOptions?: unknown[];
    };
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
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON", 400);
  }

  try {
    const existing = await findSwapPostById(id);
    if (!existing) return error("Not found", 404);
    if (existing.userId !== session.user.id) return error("Unauthorized", 403);
    if (existing.status !== "OPEN") return error("Post is no longer open for editing", 400);

    const wantCriteria = body.wantCriteria;
    if (!wantCriteria || typeof wantCriteria.wantType !== "string") {
      return error("wantCriteria.wantType is required", 400);
    }

    const selectedTrips = Array.isArray(body.selectedTrips) ? body.selectedTrips : [];
    if (selectedTrips.length > MAX_TRIPS_PER_POST) {
      return error(`Maximum ${MAX_TRIPS_PER_POST} trips per post`, 400);
    }
    const selectedDaysOff = Array.isArray(body.selectedDaysOff)
      ? body.selectedDaysOff
      : existing.offeredDaysOff;
    const postType = (body.postType ?? existing.postType) as string;
    const validPostTypes = new Set(["OFFERING_TRIPS", "VACATION_SWAP"]);
    if (!validPostTypes.has(postType)) {
      return error("postType must be one of: OFFERING_TRIPS, VACATION_SWAP", 400);
    }

    if (postType === "VACATION_SWAP") {
      const parsedYear = body.vacationYear != null ? Number(body.vacationYear) : undefined;
      const resolvedYear =
        parsedYear !== undefined && Number.isInteger(parsedYear)
          ? parsedYear
          : existing.vacationYear != null
            ? Number(existing.vacationYear)
            : NaN;
      if (!Number.isInteger(resolvedYear)) {
        return error("Vacation swap requires vacationYear", 400);
      }
      if (!isAllowedVacationSwapYear(resolvedYear, { existingYear: existing.vacationYear })) {
        const { min, max } = getVacationSwapYearRange();
        return error(`vacationYear must be ${min} or ${max}`, 400);
      }
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
    const normalizedManualTrips = normalizeManualOfferedTrips(body.offeredTrips);
    if (normalizedManualTrips.errorMessage) {
      return error(normalizedManualTrips.errorMessage, 400);
    }
    const hasQuickTrip = !!body.quickTrip?.tripType && !!body.quickTrip?.date;
    if (normalizedManualTrips.trips.length === 0 && hasQuickTrip) {
      const fallback = normalizeManualOfferedTrips([
        {
          tripType: body.quickTrip!.tripType,
          destination: body.quickTrip!.destinations?.[0],
          destinations: body.quickTrip!.destinations,
          date: body.quickTrip!.date,
          layoverHours: body.quickTrip!.layoverHours ?? null,
          reportTime: body.advanced?.reportTime ?? null,
          aircraftTypeCode: body.advanced?.aircraftTypeCode ?? null,
          blockHours: body.advanced?.blockHours ?? null,
          flightNumber: body.advanced?.flightNumber ?? null,
        },
      ]);
      if (fallback.errorMessage) return error(fallback.errorMessage, 400);
      normalizedManualTrips.trips = fallback.trips;
    }

    const hasTripPayload =
      Array.isArray(body.selectedTrips) || Array.isArray(body.offeredTrips) || hasQuickTrip;
    if (
      postType === "OFFERING_TRIPS" &&
      hasTripPayload &&
      selectedTrips.length === 0 &&
      normalizedManualTrips.trips.length === 0
    ) {
      return error("Flight Swap requires selectedTrips or offeredTrips data", 400);
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

    if (postType !== "VACATION_SWAP" && selectedTrips.length > 0) {
      const trips = await prisma.scheduleTrip.findMany({
        where: {
          id: { in: selectedTrips },
          schedule: { userId: session.user.id },
        },
        include: {
          legs: { orderBy: { legOrder: "asc" } },
          layovers: { orderBy: { afterLegOrder: "asc" } },
        },
      });

      for (const trip of trips) {
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
    } else if (postType !== "VACATION_SWAP" && normalizedManualTrips.trips.length > 0) {
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

    if (postType === "OFFERING_TRIPS" && swapPostTrips.length > 0) {
      const { tripFingerprints, looseManualMultiStopKeys } = await getOpenOfferingDedupeInfoForUser(
        session.user.id,
        { excludeSwapPostId: id }
      );
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
    }

    const vacationYear = postType === "VACATION_SWAP" && body.vacationYear != null ? Number(body.vacationYear) : undefined;
    const vacationMonth = postType === "VACATION_SWAP" && body.vacationMonth != null ? Number(body.vacationMonth) : undefined;
    const vacationStartDay = postType === "VACATION_SWAP" && body.vacationStartDay != null ? Number(body.vacationStartDay) : undefined;
    const vacationEndDay = postType === "VACATION_SWAP" && body.vacationEndDay != null ? Number(body.vacationEndDay) : undefined;
    const desiredVacationMonths = postType === "VACATION_SWAP" && Array.isArray(body.desiredVacationMonths)
      ? (body.desiredVacationMonths as number[]).map((m) => Number(m)).filter((m) => m >= 1 && m <= 12)
      : undefined;

    const post = await updateSwapPost(id, session.user.id, {
      wantCriteria: criteria,
      offeringDaysOff: false,
      offeredDaysOff: selectedDaysOff,
      swapPostTrips: hasTripPayload ? swapPostTrips : undefined,
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
      vacationYear: vacationYear ?? undefined,
      vacationMonth: vacationMonth ?? undefined,
      vacationStartDay: vacationStartDay ?? undefined,
      vacationEndDay: vacationEndDay ?? undefined,
      desiredVacationMonths: desiredVacationMonths ?? undefined,
    });

    await trackEventServer({
      eventName: "swap_post_updated",
      userId: session.user.id,
      path: "/dashboard/add-trade",
      properties: {
        postId: id,
        source: selectedTrips.length > 0 ? "SCHEDULE_PREFILL" : "MANUAL_QUICK",
      },
    }).catch(() => {});

    // Wants/offer changed: cached match scores are stale for both this post (viewers seeing it)
    // and for this user (they may match other posts differently now).
    await invalidateMatchCacheForPosts([id]).catch(() => {});
    await invalidateMatchCacheForViewer(session.user.id).catch(() => {});

    return json(post);
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : null;
    if (code === "P2021") {
      return NextResponse.json(
        { data: null, error: "ServerConfig", message: "Not available. Please try again later." },
        { status: 503 }
      );
    }
    if (code === "P2022") {
      console.error("[swap-posts PATCH] Unknown column — schema not applied. Run: npx prisma db push");
      return NextResponse.json(
        { data: null, error: "ServerConfig", message: "Posting is not available right now. Please try again later." },
        { status: 503 }
      );
    }
    console.error("[swap-posts PATCH]", err);
    return NextResponse.json(
      { data: null, error: "ServerError", message: "Failed to update post. Please try again." },
      { status: 500 }
    );
  }
}
