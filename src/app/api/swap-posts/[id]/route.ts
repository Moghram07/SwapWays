import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { findSwapPostById, updateSwapPost } from "@/repositories/swapPostRepository";
import { prisma } from "@/lib/prisma";
import { classifyTrip, getUniqueDestinations } from "@/utils/tripClassifier";

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
      wtfDays?: number[];
      wantDaysOff?: boolean;
      notes?: string;
    };
    vacationYear?: number;
    vacationMonth?: number;
    vacationStartDay?: number;
    vacationEndDay?: number;
    desiredVacationMonths?: number[];
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
    const selectedDaysOff = Array.isArray(body.selectedDaysOff) ? body.selectedDaysOff : [];
    const postType = (body.postType ?? existing.postType) as string;

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
          departureDate: trip.startDate,
          tripType,
          creditHours: trip.creditHours,
          tafb: trip.tafb,
          hasLayover,
          layoverCity: hasLayover && layover ? layover.airport : null,
          layoverHours: hasLayover && layover ? layover.durationDecimal : null,
        });
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
      offeringDaysOff: postType === "OFFERING_DAYS_OFF",
      offeredDaysOff: selectedDaysOff,
      swapPostTrips: swapPostTrips.length > 0 ? swapPostTrips : undefined,
      vacationYear: vacationYear ?? undefined,
      vacationMonth: vacationMonth ?? undefined,
      vacationStartDay: vacationStartDay ?? undefined,
      vacationEndDay: vacationEndDay ?? undefined,
      desiredVacationMonths: desiredVacationMonths ?? undefined,
    });

    return json(post);
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : null;
    if (code === "P2021") {
      return NextResponse.json(
        { data: null, error: "ServerConfig", message: "Not available. Please try again later." },
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
