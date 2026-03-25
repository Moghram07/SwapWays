import { prisma } from "@/lib/prisma";
import type { ParsedSchedule } from "@/types/schedule";
import { classifyTrip } from "@/utils/tripClassifier";
import { getTripRouteType } from "@/utils/airportNames";

const REPLACE_SCHEDULE_TX_TIMEOUT_MS = 15000;

/** True when the error indicates the ScheduleTripLayover table (or relation) is missing. */
function isLayoverTableMissing(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("does not exist") || msg.includes("ScheduleTripLayover");
}

export async function createScheduleFromParsed(
  userId: string,
  parsed: ParsedSchedule,
  rawText?: string
) {
  const { month, year, lineNumber, totalCredit, totalBlock, daysOff, dutyPeriods, trips } = parsed;

  // If we might replace an existing schedule, delete layovers in a separate transaction first.
  // If ScheduleTripLayover table is missing, this avoids aborting the main transaction (Postgres 25P02).
  const existing = await prisma.schedule.findUnique({
    where: { userId_month_year: { userId, month, year } },
    select: { id: true },
  });
  if (existing) {
    try {
      await prisma.scheduleTripLayover.deleteMany({
        where: { scheduleTrip: { scheduleId: existing.id } },
      });
    } catch {
      // Table may not exist yet; ignore so main transaction never touches layovers.
    }
  }

  const schedule = await prisma.$transaction(
    async (tx) => {
      const current = await tx.schedule.findUnique({
        where: {
          userId_month_year: { userId, month, year },
        },
      });
      if (current) {
        const tripIds = await tx.scheduleTrip
          .findMany({
            where: { scheduleId: current.id },
            select: { id: true },
          })
          .then((rows) => rows.map((r) => r.id));
        if (tripIds.length > 0) {
          try {
            await tx.trade.updateMany({
              where: { scheduleTripId: { in: tripIds } },
              data: { scheduleTripId: null },
            });
          } catch (err) {
            if (!(err instanceof TypeError)) throw err;
          }
          await tx.swapPostTrip.deleteMany({
            where: { scheduleTripId: { in: tripIds } },
          });
          await tx.conversationOffer.deleteMany({
            where: { scheduleTripId: { in: tripIds } },
          });
          await tx.conversation.updateMany({
            where: { offeredTripId: { in: tripIds } },
            data: { offeredTripId: null },
          });
        }
        await tx.scheduleTripLeg.deleteMany({
          where: { scheduleTrip: { scheduleId: current.id } },
        });
        await tx.scheduleTrip.deleteMany({ where: { scheduleId: current.id } });
        await tx.schedule.delete({ where: { id: current.id } });
      }

      return tx.schedule.create({
        data: {
          userId,
          lineNumber,
          month,
          year,
          totalCredit: totalCredit ?? null,
          totalBlock: totalBlock ?? null,
          daysOff: daysOff ?? null,
          dutyPeriods: dutyPeriods ?? null,
          rawText: rawText ?? null,
        },
      });
    },
    { timeout: REPLACE_SCHEDULE_TX_TIMEOUT_MS }
  );

  for (const trip of trips) {
    const firstLeg = trip.legs[0];
    const lastLeg = trip.legs[trip.legs.length - 1];
    const startDate = firstLeg?.departureDate ?? trip.reportDate ?? new Date();
    const endDate = lastLeg?.arrivalDate ?? startDate;
    const tripType = classifyTrip({ legs: trip.legs, layovers: trip.layovers });
    const routeTypeRaw = getTripRouteType(trip.legs);
    const routeType = routeTypeRaw === "domestic" ? "DOMESTIC" : "INTERNATIONAL";

    const tripData = {
      scheduleId: schedule.id,
      tripNumber: trip.tripNumber,
      instanceId: trip.instanceId,
      reportTime: trip.reportTime,
      startDate,
      endDate,
      tripType,
      routeType,
      creditHours: trip.creditHours,
      blockHours: trip.blockHours,
      tafb: trip.tafb,
      legs: {
        create: trip.legs.map((leg) => ({
          legOrder: leg.legOrder,
          dayOfWeek: leg.dayOfWeek,
          flightNumber: leg.flightNumber,
          aircraftTypeCode: leg.aircraftTypeCode,
          departureDate: leg.departureDate ?? startDate,
          departureTime: leg.departureTime,
          departureAirport: leg.departureAirport,
          arrivalDate: leg.arrivalDate ?? endDate,
          arrivalTime: leg.arrivalTime,
          arrivalAirport: leg.arrivalAirport,
          flyingTimeRaw: leg.flyingTimeRaw ?? null,
          flyingTime: leg.flyingTime,
          layoverDuration: leg.layoverDuration ?? null,
          layoverAirport: leg.layoverAirport ?? null,
        })),
      },
      ...((trip.layovers?.length ?? 0) > 0 && {
        layovers: {
          create: trip.layovers!.map((lo) => ({
            airport: lo.airport,
            durationRaw: lo.durationRaw,
            durationDecimal: lo.durationDecimal,
            afterLegOrder: lo.afterLegOrder,
          })),
        },
      }),
    };

    try {
      await prisma.scheduleTrip.create({
        data: { ...tripData, routeType: tripData.routeType as "DOMESTIC" | "INTERNATIONAL" },
      });
    } catch (createErr) {
      const msg = createErr instanceof Error ? createErr.message : String(createErr);
      const hasLayovers = (trip.layovers?.length ?? 0) > 0;
      const layoversUnsupported =
        msg.includes("Unknown arg") || msg.includes("layovers") || isLayoverTableMissing(createErr);
      if (hasLayovers && layoversUnsupported) {
        const { layovers: _lo, ...dataWithoutLayovers } = tripData as typeof tripData & { layovers?: unknown };
        await prisma.scheduleTrip.create({
          data: { ...dataWithoutLayovers, routeType: dataWithoutLayovers.routeType as "DOMESTIC" | "INTERNATIONAL" },
        });
      } else {
        throw createErr;
      }
    }
  }

  return schedule;
}

export async function findScheduleByUserAndMonth(userId: string, month: number, year: number) {
  try {
    return await prisma.schedule.findUnique({
      where: {
        userId_month_year: { userId, month, year },
      },
      include: {
        user: {
          include: { airline: true },
        },
        trips: {
          include: {
            legs: { orderBy: { legOrder: "asc" } },
            layovers: { orderBy: { afterLegOrder: "asc" } },
          },
        },
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Unknown arg") || msg.includes("layovers") || isLayoverTableMissing(err)) {
      return prisma.schedule.findUnique({
        where: {
          userId_month_year: { userId, month, year },
        },
        include: {
          user: { include: { airline: true } },
          trips: {
            include: { legs: { orderBy: { legOrder: "asc" } } },
          },
        },
      });
    }
    throw err;
  }
}

export async function deleteSchedule(scheduleId: string) {
  try {
    await prisma.scheduleTripLayover.deleteMany({
      where: { scheduleTrip: { scheduleId } },
    });
  } catch {
    // Table may not exist; ignore.
  }
  return prisma.$transaction(async (tx) => {
    const tripIds = await tx.scheduleTrip
      .findMany({ where: { scheduleId }, select: { id: true } })
      .then((rows) => rows.map((r) => r.id));
    if (tripIds.length > 0) {
      try {
        await tx.trade.updateMany({
          where: { scheduleTripId: { in: tripIds } },
          data: { scheduleTripId: null },
        });
      } catch (err) {
        if (!(err instanceof TypeError)) throw err;
      }
      await tx.swapPostTrip.deleteMany({
        where: { scheduleTripId: { in: tripIds } },
      });
      await tx.conversationOffer.deleteMany({
        where: { scheduleTripId: { in: tripIds } },
      });
      await tx.conversation.updateMany({
        where: { offeredTripId: { in: tripIds } },
        data: { offeredTripId: null },
      });
    }
    await tx.scheduleTripLeg.deleteMany({
      where: { scheduleTrip: { scheduleId } },
    });
    await tx.scheduleTrip.deleteMany({ where: { scheduleId } });
    await tx.schedule.delete({ where: { id: scheduleId } });
    return { id: scheduleId };
  });
}

/** Upcoming schedule legs for dashboard / My Flights: departureDate >= today, sorted by date */
export async function findUpcomingScheduleLegs(userId: string, limit = 50) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const legs = await prisma.scheduleTripLeg.findMany({
    where: {
      scheduleTrip: { schedule: { userId } },
      departureDate: { gte: today },
    },
    orderBy: { departureDate: "asc" },
    take: limit,
    include: {
      scheduleTrip: {
        select: { tripNumber: true, reportTime: true },
      },
    },
  });

  return legs;
}

/** Upcoming schedule trips (one per pairing) for My Flights: startDate >= today, with legs and layovers */
export async function findUpcomingScheduleTrips(userId: string, limit = 50) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const trips = await prisma.scheduleTrip.findMany({
    where: {
      schedule: { userId },
      startDate: { gte: today },
    },
    orderBy: { startDate: "asc" },
    take: limit,
    include: {
      legs: { orderBy: { legOrder: "asc" } },
      layovers: { orderBy: { afterLegOrder: "asc" } },
    },
  });

  return trips;
}
