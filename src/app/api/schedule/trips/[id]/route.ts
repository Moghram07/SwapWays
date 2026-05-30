import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function unauthorized() {
  return NextResponse.json(
    { data: null, error: "Unauthorized", message: "Please sign in" },
    { status: 401 }
  );
}

function error(message: string, status: number) {
  return NextResponse.json({ data: null, error: "Error", message }, { status });
}

/** GET one trip by id; caller must own the schedule. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;

  const trip = await prisma.scheduleTrip.findUnique({
    where: { id },
    include: {
      schedule: { select: { userId: true } },
      legs: { orderBy: { legOrder: "asc" } },
      layovers: { orderBy: { afterLegOrder: "asc" } },
    },
  });

  if (!trip) return error("Trip not found", 404);
  if (trip.schedule.userId !== session.user.id) return error("Forbidden", 403);

  return NextResponse.json({
    data: {
      id: trip.id,
      tripNumber: trip.tripNumber,
      startDate: trip.startDate.toISOString(),
      creditHours: trip.creditHours,
      blockHours: trip.blockHours ?? null,
      tripType: trip.tripType,
      reportTime: trip.reportTime,
      legDeadheadsOverride: (trip.legDeadheadsOverride as boolean[] | null) ?? null,
      legs: trip.legs.map((leg) => ({
        id: leg.id,
        legOrder: leg.legOrder,
        flightNumber: leg.flightNumber,
        departureAirport: leg.departureAirport,
        arrivalAirport: leg.arrivalAirport,
        departureTime: leg.departureTime,
        arrivalTime: leg.arrivalTime,
        departureDate: leg.departureDate.toISOString(),
        arrivalDate: leg.arrivalDate.toISOString(),
      })),
      layovers: trip.layovers.map((l) => ({
        airport: l.airport,
        durationDecimal: l.durationDecimal,
      })),
    },
    error: null,
    message: null,
  });
}

/** Normalize schedule time to HH.MM or HH.MMZ. */
function normalizeTime(s: string | undefined): string | undefined {
  if (s == null || typeof s !== "string") return undefined;
  const t = s.trim();
  if (!t) return undefined;
  const withZ = t.endsWith("Z") ? t : t + "Z";
  const normalized = withZ.replace(":", ".");
  return normalized;
}

/** PATCH trip report time, leg times, trip type, and/or DH overrides. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;

  const trip = await prisma.scheduleTrip.findUnique({
    where: { id },
    include: {
      schedule: { select: { userId: true } },
      legs: { select: { id: true } },
      layovers: { orderBy: { afterLegOrder: "asc" } },
    },
  });

  if (!trip) return error("Trip not found", 404);
  if (trip.schedule.userId !== session.user.id) return error("Forbidden", 403);

  let body: {
    reportTime?: string;
    tripType?: "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
    legDeadheads?: boolean[];
    legs?: Array<{
      id: string;
      departureTime?: string;
      arrivalTime?: string;
      departureDate?: string;
      arrivalDate?: string;
    }>;
    layoverCity?: string;
    layoverHours?: number;
  };
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON", 400);
  }

  const legIds = new Set(trip.legs.map((l) => l.id));

  if (body.reportTime != null) {
    const rt = normalizeTime(body.reportTime);
    if (rt) {
      await prisma.scheduleTrip.update({
        where: { id },
        data: { reportTime: rt },
      });
    }
  }

  if (body.tripType != null && ["LAYOVER", "TURNAROUND", "MULTI_STOP"].includes(body.tripType)) {
    await prisma.scheduleTrip.update({ where: { id }, data: { tripType: body.tripType } });
    await prisma.swapPostTrip.updateMany({
      where: { scheduleTripId: id, swapPost: { status: "OPEN" } },
      data: { tripType: body.tripType },
    });
  }

  if (Array.isArray(body.legDeadheads)) {
    await prisma.scheduleTrip.update({
      where: { id },
      data: { legDeadheadsOverride: body.legDeadheads },
    });
    await prisma.swapPostTrip.updateMany({
      where: { scheduleTripId: id, swapPost: { status: "OPEN" } },
      data: { legDeadheads: body.legDeadheads },
    });
  }

  if (Array.isArray(body.legs) && body.legs.length > 0) {
    for (const leg of body.legs) {
      if (!leg.id || !legIds.has(leg.id)) continue;
      const data: { departureTime?: string; arrivalTime?: string; departureDate?: Date; arrivalDate?: Date } = {};
      const depTime = normalizeTime(leg.departureTime);
      if (depTime) data.departureTime = depTime;
      const arrTime = normalizeTime(leg.arrivalTime);
      if (arrTime) data.arrivalTime = arrTime;
      if (leg.departureDate) data.departureDate = new Date(leg.departureDate);
      if (leg.arrivalDate) data.arrivalDate = new Date(leg.arrivalDate);
      if (Object.keys(data).length > 0) {
        await prisma.scheduleTripLeg.update({
          where: { id: leg.id },
          data,
        });
      }
    }
  }

  if (body.layoverCity != null) {
    const city = body.layoverCity.trim();
    const hours = body.layoverHours ?? 0;
    if (trip.layovers.length > 0) {
      await prisma.scheduleTripLayover.update({
        where: { id: trip.layovers[0].id },
        data: { airport: city || trip.layovers[0].airport, durationDecimal: hours, durationRaw: String(hours) },
      });
    } else if (city) {
      await prisma.scheduleTripLayover.create({
        data: { scheduleTripId: id, airport: city, durationDecimal: hours, durationRaw: String(hours), afterLegOrder: 0 },
      });
    }
    if (city) {
      await prisma.swapPostTrip.updateMany({
        where: { scheduleTripId: id, swapPost: { status: "OPEN" } },
        data: { layoverCity: city, layoverHours: hours, hasLayover: true },
      });
    }
  }

  return NextResponse.json({ data: { success: true }, error: null, message: null });
}
