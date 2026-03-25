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

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const schedule = await prisma.schedule.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      trips: {
        include: {
          legs: { orderBy: { legOrder: "asc" } },
          layovers: { orderBy: { afterLegOrder: "asc" } },
        },
      },
    },
  });

  if (!schedule) return json(null);

  const layovers = schedule.trips
    .flatMap((trip) => trip.layovers)
    .map((layover) => ({
      destination: layover.airport,
      durationDecimal: layover.durationDecimal,
      durationRaw: layover.durationRaw,
    }));

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

  const hasReserve = schedule.trips.some(
    (trip) => trip.tripNumber.toUpperCase() === "RESERVE"
  );

  const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return json({
    lineNumber: schedule.lineNumber,
    month: monthNames[schedule.month] ?? "Jan",
    year: schedule.year,
    totalBlock: schedule.totalBlock,
    daysOff,
    hasReserve,
    layovers,
    scheduleId: schedule.id,
  });
}
