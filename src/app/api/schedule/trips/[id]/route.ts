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
    },
  });

  if (!trip) return error("Trip not found", 404);
  if (trip.schedule.userId !== session.user.id) return error("Forbidden", 403);

  return NextResponse.json({
    data: {
      id: trip.id,
      reportTime: trip.reportTime,
      legs: trip.legs.map((leg) => ({
        id: leg.id,
        legOrder: leg.legOrder,
        departureTime: leg.departureTime,
        arrivalTime: leg.arrivalTime,
        departureDate: leg.departureDate.toISOString(),
        arrivalDate: leg.arrivalDate.toISOString(),
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

/** PATCH trip report time and/or leg times. */
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
    },
  });

  if (!trip) return error("Trip not found", 404);
  if (trip.schedule.userId !== session.user.id) return error("Forbidden", 403);

  let body: {
    reportTime?: string;
    legs?: Array<{
      id: string;
      departureTime?: string;
      arrivalTime?: string;
      departureDate?: string;
      arrivalDate?: string;
    }>;
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

  return NextResponse.json({ data: { success: true }, error: null, message: null });
}
