import { prisma } from "@/lib/prisma";
import { SwapPostType as PrismaSwapPostType } from "@/generated/prisma";
import type { SwapPostType } from "@/types/swapPost";
import type { WantCriteriaData } from "@/types/swapPost";

const swapPostSelect = {
  id: true,
  userId: true,
  postType: true,
  status: true,
  offeringDaysOff: true,
  offeredDaysOff: true,
  wantType: true,
  wantTripTypes: true,
  wantMinLayover: true,
  wantMinCredit: true,
  wantMaxCredit: true,
  wantEqualHours: true,
  wantSameDate: true,
  wantDestinations: true,
  wantExclude: true,
  wtfDays: true,
  wantDaysOff: true,
  notes: true,
  vacationStartDate: true,
  vacationEndDate: true,
  desiredVacationStart: true,
  desiredVacationEnd: true,
  vacationYear: true,
  vacationMonth: true,
  vacationStartDay: true,
  vacationEndDay: true,
  desiredVacationMonths: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      rank: { select: { name: true, code: true } },
      base: { select: { name: true, airportCode: true } },
    },
  },
  offeredTrips: {
    select: {
      id: true,
      scheduleTripId: true,
      flightNumber: true,
      destination: true,
      departureDate: true,
      tripType: true,
      creditHours: true,
      tafb: true,
      hasLayover: true,
      layoverCity: true,
      layoverHours: true,
      scheduleTrip: {
        select: {
          reportTime: true,
          legs: {
            select: {
              legOrder: true,
              flightNumber: true,
              aircraftTypeCode: true,
              departureTime: true,
              departureDate: true,
              departureAirport: true,
              arrivalTime: true,
              arrivalDate: true,
              arrivalAirport: true,
              flyingTime: true,
            },
          },
        },
      },
    },
  },
} as const;

export async function createSwapPost(
  userId: string,
  data: {
    postType: SwapPostType;
    offeringDaysOff: boolean;
    offeredDaysOff: number[];
    wantCriteria: WantCriteriaData;
    swapPostTrips: {
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
    }[];
    vacationStartDate?: Date | null;
    vacationEndDate?: Date | null;
    desiredVacationStart?: Date | null;
    desiredVacationEnd?: Date | null;
    vacationYear?: number | null;
    vacationMonth?: number | null;
    vacationStartDay?: number | null;
    vacationEndDay?: number | null;
    desiredVacationMonths?: number[];
  }
) {
  const post = await prisma.swapPost.create({
    data: {
      userId,
      postType: (PrismaSwapPostType[data.postType as keyof typeof PrismaSwapPostType] ?? data.postType) as (typeof PrismaSwapPostType)[keyof typeof PrismaSwapPostType],
      offeringDaysOff: data.offeringDaysOff,
      offeredDaysOff: data.offeredDaysOff,
      wantType: data.wantCriteria.wantType,
      wantTripTypes: data.wantCriteria.wantTripTypes,
      wantMinLayover: data.wantCriteria.wantMinLayover,
      wantMinCredit: data.wantCriteria.wantMinCredit,
      wantMaxCredit: data.wantCriteria.wantMaxCredit,
      wantEqualHours: data.wantCriteria.wantEqualHours,
      wantSameDate: data.wantCriteria.wantSameDate,
      wantDestinations: data.wantCriteria.wantDestinations,
      wantExclude: data.wantCriteria.wantExclude,
      wtfDays: data.wantCriteria.wtfDays,
      wantDaysOff: data.wantCriteria.wantDaysOff,
      notes: data.wantCriteria.notes || null,
      vacationStartDate: data.vacationStartDate ?? undefined,
      vacationEndDate: data.vacationEndDate ?? undefined,
      desiredVacationStart: data.desiredVacationStart ?? undefined,
      desiredVacationEnd: data.desiredVacationEnd ?? undefined,
      vacationYear: data.vacationYear ?? undefined,
      vacationMonth: data.vacationMonth ?? undefined,
      vacationStartDay: data.vacationStartDay ?? undefined,
      vacationEndDay: data.vacationEndDay ?? undefined,
      desiredVacationMonths: data.desiredVacationMonths ?? [],
      offeredTrips: data.swapPostTrips.length
        ? {
            create: data.swapPostTrips.map((t) => ({
              scheduleTripId: t.scheduleTripId,
              flightNumber: t.flightNumber,
              destination: t.destination,
              departureDate: t.departureDate,
              tripType: t.tripType,
              creditHours: t.creditHours,
              tafb: t.tafb,
              hasLayover: t.hasLayover,
              layoverCity: t.layoverCity,
              layoverHours: t.layoverHours,
            })),
          }
        : undefined,
    },
    select: swapPostSelect,
  });
  return post;
}

export async function findSwapPostsForBoard(
  currentUserId: string,
  baseId: string,
  filters?: {
    postType?: SwapPostType;
    tripType?: "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
    destination?: string;
    lookingForCurrentDays?: number[];
    lookingForNextDays?: number[];
    routeType?: "DOMESTIC" | "INTERNATIONAL";
    rankId?: string;
  }
) {
  const where: {
    status: "OPEN";
    userId: { not: string };
    user: { baseId: string; rankId?: string };
    postType?: SwapPostType;
  } = {
    status: "OPEN",
    userId: { not: currentUserId },
    user: { baseId },
  };
  if (filters?.postType) where.postType = filters.postType;
  if (filters?.postType === "VACATION_SWAP" && filters?.rankId) {
    where.user.rankId = filters.rankId;
  }

  const posts = await prisma.swapPost.findMany({
    where,
    take: 20,
    orderBy: { createdAt: "desc" },
    select: swapPostSelect,
  });

  let filtered = posts;
  if (filters?.tripType) {
    filtered = filtered.filter((p) =>
      p.offeredTrips.some((t) => t.tripType === filters.tripType)
    );
  }
  if (filters?.destination) {
    filtered = filtered.filter((p) =>
      p.offeredTrips.some((t) => t.destination === filters.destination)
    );
  }

  const currentDays = filters?.lookingForCurrentDays ?? [];
  const nextDays = filters?.lookingForNextDays ?? [];
  if (currentDays.length > 0 || nextDays.length > 0) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

    filtered = filtered.filter((p) => {
      if (p.postType === "VACATION_SWAP") {
        const vMonth = p.vacationMonth ?? 0;
        const vYear = p.vacationYear ?? 0;
        const startDay = p.vacationStartDay ?? 1;
        const endDay = p.vacationEndDay ?? 31;
        const matchesCurrent =
          currentDays.length > 0 &&
          vMonth === currentMonth &&
          vYear === currentYear &&
          currentDays.some((d) => d >= startDay && d <= endDay);
        const matchesNext =
          nextDays.length > 0 &&
          vMonth === nextMonth &&
          vYear === nextYear &&
          nextDays.some((d) => d >= startDay && d <= endDay);
        return matchesCurrent || matchesNext;
      }
      return p.offeredTrips.some((t) => {
        const d = new Date(t.departureDate);
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        const day = d.getDate();
        const matchesCurrent =
          currentDays.length > 0 &&
          month === currentMonth &&
          year === currentYear &&
          currentDays.includes(day);
        const matchesNext =
          nextDays.length > 0 &&
          month === nextMonth &&
          year === nextYear &&
          nextDays.includes(day);
        return matchesCurrent || matchesNext;
      });
    });
  }

  return filtered;
}

export async function findSwapPostsByUserId(userId: string) {
  return prisma.swapPost.findMany({
    where: { userId },
    select: swapPostSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function findSwapPostById(id: string) {
  return prisma.swapPost.findUnique({
    where: { id },
    select: swapPostSelect,
  });
}

export async function findSwapPostByIdWithMatchingDetails(id: string) {
  return prisma.swapPost.findUnique({
    where: { id },
    include: {
      user: {
        include: {
          rank: true,
          base: true,
          qualifications: { include: { aircraftType: true } },
        },
      },
      offeredTrips: {
        include: {
          scheduleTrip: {
            include: {
              legs: { orderBy: { legOrder: "asc" } },
              layovers: { orderBy: { afterLegOrder: "asc" } },
            },
          },
        },
      },
    },
  });
}

export async function updateSwapPost(
  id: string,
  userId: string,
  data: {
    wantCriteria: WantCriteriaData;
    offeringDaysOff?: boolean;
    offeredDaysOff?: number[];
    swapPostTrips?: {
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
    }[];
    vacationYear?: number;
    vacationMonth?: number;
    vacationStartDay?: number;
    vacationEndDay?: number;
    desiredVacationMonths?: number[];
  }
) {
  const existing = await prisma.swapPost.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!existing || existing.userId !== userId) {
    throw new Error("Not found or unauthorized");
  }

  const updateData: Parameters<typeof prisma.swapPost.update>[0]["data"] = {
    wantType: data.wantCriteria.wantType,
    wantTripTypes: data.wantCriteria.wantTripTypes,
    wantMinLayover: data.wantCriteria.wantMinLayover,
    wantMinCredit: data.wantCriteria.wantMinCredit,
    wantMaxCredit: data.wantCriteria.wantMaxCredit,
    wantEqualHours: data.wantCriteria.wantEqualHours,
    wantSameDate: data.wantCriteria.wantSameDate,
    wantDestinations: data.wantCriteria.wantDestinations,
    wantExclude: data.wantCriteria.wantExclude,
    wtfDays: data.wantCriteria.wtfDays,
    wantDaysOff: data.wantCriteria.wantDaysOff,
    notes: data.wantCriteria.notes || null,
  };
  if (data.offeringDaysOff !== undefined) updateData.offeringDaysOff = data.offeringDaysOff;
  if (data.offeredDaysOff !== undefined) updateData.offeredDaysOff = data.offeredDaysOff;
  if (data.vacationYear !== undefined) updateData.vacationYear = data.vacationYear;
  if (data.vacationMonth !== undefined) updateData.vacationMonth = data.vacationMonth;
  if (data.vacationStartDay !== undefined) updateData.vacationStartDay = data.vacationStartDay;
  if (data.vacationEndDay !== undefined) updateData.vacationEndDay = data.vacationEndDay;
  if (data.desiredVacationMonths !== undefined) updateData.desiredVacationMonths = data.desiredVacationMonths;

  return prisma.$transaction(async (tx) => {
    await tx.swapPost.update({
      where: { id },
      data: updateData,
    });
    if (data.swapPostTrips !== undefined) {
      await tx.swapPostTrip.deleteMany({ where: { swapPostId: id } });
      if (data.swapPostTrips.length > 0) {
        await tx.swapPostTrip.createMany({
          data: data.swapPostTrips.map((t) => ({
            swapPostId: id,
            scheduleTripId: t.scheduleTripId,
            flightNumber: t.flightNumber,
            destination: t.destination,
            departureDate: t.departureDate,
            tripType: t.tripType,
            creditHours: t.creditHours,
            tafb: t.tafb,
            hasLayover: t.hasLayover,
            layoverCity: t.layoverCity,
            layoverHours: t.layoverHours,
          })),
        });
      }
    }
    const post = await tx.swapPost.findUnique({
      where: { id },
      select: swapPostSelect,
    });
    if (!post) throw new Error("Post not found after update");
    return post;
  });
}
