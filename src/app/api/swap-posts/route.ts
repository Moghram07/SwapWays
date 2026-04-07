import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { createSwapPost, findSwapPostsByUserId } from "@/repositories/swapPostRepository";
import { prisma } from "@/lib/prisma";
import { classifyTrip, getUniqueDestinations } from "@/utils/tripClassifier";
import { findMatchesForPost } from "@/services/matching/matchEngine";
import { createNotification } from "@/lib/notifications";
import { isSwapPostExpired } from "@/lib/swapExpiry";
import { trackEventServer } from "@/lib/analytics/server";

function normalizeFlightNumber(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  return s.toUpperCase().startsWith("DH") ? s.slice(2) : s;
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

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();
  const { searchParams } = new URL(request.url);
  if (searchParams.get("mine") !== "1") {
    return error("Use ?mine=1 to fetch your swap posts", 400);
  }
  try {
    const posts = await findSwapPostsByUserId(session.user.id);
    const now = new Date();
    return json(posts.filter((post) => !isSwapPostExpired(post, now)));
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : null;
    if (code === "P2021") {
      console.error("[swap-posts GET] Database table missing.");
      return NextResponse.json(
        { data: null, error: "ServerConfig", message: "Not available. Please try again later." },
        { status: 503 }
      );
    }
    console.error("[swap-posts GET]", err);
    return NextResponse.json(
      { data: null, error: "ServerError", message: "Failed to load your posts." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

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
      wtfDays?: number[];
      wantDaysOff?: boolean;
      notes?: string;
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

  const postType = body.postType as "OFFERING_TRIPS" | "VACATION_SWAP" | undefined;
  const validTypes = ["OFFERING_TRIPS", "VACATION_SWAP"];
  if (!postType || !validTypes.includes(postType)) {
    return error("postType is required and must be one of: " + validTypes.join(", "), 400);
  }

  if (postType === "VACATION_SWAP") {
    const year = body.vacationYear != null ? Number(body.vacationYear) : NaN;
    const month = body.vacationMonth != null ? Number(body.vacationMonth) : NaN;
    const desiredMonths = Array.isArray(body.desiredVacationMonths)
      ? body.desiredVacationMonths.map((m: unknown) => Number(m)).filter((m: number) => m >= 1 && m <= 12)
      : [];
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return error("Vacation swap requires vacationYear (2000–2100)", 400);
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
  const selectedDaysOff = Array.isArray(body.selectedDaysOff) ? body.selectedDaysOff : [];
  const quickTrip = body.quickTrip;
  const hasQuickTrip = !!quickTrip?.tripType && !!quickTrip?.date;
  if (postType === "OFFERING_TRIPS" && selectedTrips.length === 0 && !hasQuickTrip) {
    return error("Flight Swap requires selectedTrips or quickTrip data", 400);
  }

  const normalizedQuickTrip =
    hasQuickTrip
      ? {
          tripType: quickTrip!.tripType as "LAYOVER" | "TURNAROUND" | "MULTI_STOP",
          destinations: normalizeAirportCodes(quickTrip?.destinations),
          date: String(quickTrip?.date),
          layoverHours:
            quickTrip?.layoverHours != null ? Number(quickTrip.layoverHours) : null,
        }
      : undefined;
  if (normalizedQuickTrip && normalizedQuickTrip.destinations.length === 0) {
    return error("quickTrip.destinations is required", 400);
  }

  const criteria = {
    wantType: wantCriteria.wantType as "LAYOVER" | "LONGER_LAYOVER" | "ROUND_TRIP" | "ANY_FLIGHT" | "DAYS_OFF" | "ANYTHING" | "SPECIFIC",
    wantTripTypes: (wantCriteria.wantTripTypes ?? []) as ("LAYOVER" | "TURNAROUND" | "MULTI_STOP")[],
    wantMinLayover: wantCriteria.wantMinLayover ?? null,
    wantMinCredit: wantCriteria.wantMinCredit ?? null,
    wantMaxCredit: wantCriteria.wantMaxCredit ?? null,
    wantEqualHours: wantCriteria.wantEqualHours ?? false,
    wantSameDate: wantCriteria.wantSameDate ?? false,
    wantDestinations: wantCriteria.wantDestinations ?? [],
    wantExclude: wantCriteria.wantExclude ?? [],
    wtfDays: wantCriteria.wtfDays ?? [],
    wantDaysOff: wantCriteria.wantDaysOff ?? false,
    notes: wantCriteria.notes ?? "",
  };
  if (criteria.wantType === "DAYS_OFF" && criteria.wtfDays.length === 0) {
    return error("wantCriteria.wtfDays is required when wantType is DAYS_OFF", 400);
  }
  if (criteria.wantType === "DAYS_OFF" && selectedDaysOff.length === 0) {
    return error("selectedDaysOff is required when wantType is DAYS_OFF", 400);
  }

  const swapPostTrips: {
    scheduleTripId: string;
    flightNumber: string;
    destination: string;
    departureDate: Date;
    tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
    creditHours: number;
    tafb: number;
    hasLayover: boolean;
    layoverCity: string | null;
    layoverHours: number | null;
  }[] = [];

  try {
    if (selectedTrips.length > 0) {
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
          departureDate: trip.startDate,
          tripType,
          creditHours: trip.creditHours,
          tafb: trip.tafb,
          hasLayover,
          layoverCity: hasLayover && layover ? layover.airport : null,
          layoverHours: hasLayover && layover ? layover.durationDecimal : null,
        });
      }
      if (postType === "OFFERING_TRIPS" && swapPostTrips.length === 0) {
        return error("Selected trips were not found in your schedule", 400);
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

    const post = await createSwapPost(session.user.id, {
      postType,
      offeringDaysOff: false,
      offeredDaysOff: selectedDaysOff,
      wantCriteria: criteria,
      swapPostTrips,
      source:
        body.source ??
        (swapPostTrips.length > 0 ? "SCHEDULE_PREFILL" : "MANUAL_QUICK"),
      quickTrip: normalizedQuickTrip,
      advanced: body.advanced,
      vacationStartDate: vacationStartDate ?? null,
      vacationEndDate: vacationEndDate ?? null,
      desiredVacationStart: desiredVacationStart ?? null,
      desiredVacationEnd: desiredVacationEnd ?? null,
      vacationYear: vacationYear ?? null,
      vacationMonth: vacationMonth ?? null,
      vacationStartDay: vacationStartDay ?? null,
      vacationEndDay: vacationEndDay ?? null,
      desiredVacationMonths: desiredVacationMonths ?? [],
    });

    try {
      const matches = await findMatchesForPost(post.id);
      await Promise.all(
        matches.slice(0, 10).map((m) =>
          createNotification({
            userId: m.viewerId,
            type: "MATCH_FOUND",
            title: "New match found",
            message: `A new swap post matches your profile (${Math.round(m.matchPercent)}%).`,
            data: { postId: m.postId, matchPercent: m.matchPercent, failReason: m.failReason },
          })
        )
      );
    } catch (matchErr) {
      console.error("[swap-posts] post-created matching failed", matchErr);
    }

    await trackEventServer({
      eventName: "swap_post_created",
      userId: session.user.id,
      path: "/dashboard/add-trade",
      properties: {
        postType,
        source: body.source ?? (swapPostTrips.length > 0 ? "SCHEDULE_PREFILL" : "MANUAL_QUICK"),
        hasAdvanced: !!(
          body.advanced?.reportTime ||
          body.advanced?.aircraftTypeCode ||
          body.advanced?.blockHours ||
          body.advanced?.flightNumber
        ),
      },
    }).catch(() => {});

    return json(post);
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : null;
    if (code === "P2021") {
      console.error("[swap-posts] Database table missing. Run: npx prisma db push");
      return NextResponse.json(
        { data: null, error: "ServerConfig", message: "Posting is not available right now. Please try again later." },
        { status: 503 }
      );
    }
    console.error("[swap-posts]", err);
    return NextResponse.json(
      { data: null, error: "ServerError", message: "Failed to create post. Please try again." },
      { status: 500 }
    );
  }
}
