import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { findUpcomingScheduleTrips } from "@/repositories/scheduleRepository";

/** GET current user's upcoming schedule trips (for chat "offer trip" dropdown). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }
  const trips = await findUpcomingScheduleTrips(session.user.id, 100);
  return NextResponse.json({
    data: trips.map((t) => ({
      id: t.id,
      tripNumber: t.tripNumber,
      instanceId: t.instanceId,
      startDate: t.startDate,
      reportTime: t.reportTime ?? null,
      creditHours: t.creditHours,
      blockHours: t.blockHours,
      tafb: t.tafb,
      legs: t.legs,
      layovers: t.layovers,
      tripType: t.tripType,
      routeType: t.routeType,
    })),
    error: null,
    message: null,
  });
}
