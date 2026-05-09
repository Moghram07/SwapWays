import { prisma } from "@/lib/prisma";
import { swapPostHasDisplayableOffer } from "@/lib/swapPostDisplay";
import { isSwapPostExpired } from "@/lib/swapExpiry";
import { Prisma, SwapPostType as PrismaSwapPostType } from "@/generated/prisma";
import type { SwapPostType } from "@/types/swapPost";
import type { WantCriteriaData } from "@/types/swapPost";
import type { QuickPostAdvancedData, QuickPostTripData, SwapPostInputSource } from "@/types/swapPost";

export const swapPostSelect = {
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
  wantAcceptanceOptions: true,
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
  inputSource: true,
  quickTripType: true,
  quickDestinations: true,
  quickDate: true,
  quickLayoverHours: true,
  advancedReportTime: true,
  advancedAircraftTypeCode: true,
  advancedBlockHours: true,
  advancedFlightNumber: true,
  createdAt: true,
  updatedAt: true,
  expiresAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      tier: true,
      trialEndsAt: true,
      subscriptionStatus: true,
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
      destinations: true,
      departureDate: true,
      tripType: true,
      creditHours: true,
      tafb: true,
      reportTime: true,
      aircraftType: true,
      blockHours: true,
      hasLayover: true,
      layoverCity: true,
      layoverHours: true,
      isManualEntry: true,
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

const swapPostBoardSelect = {
  ...swapPostSelect,
  offeredTrips: {
    select: {
      id: true,
      scheduleTripId: true,
      flightNumber: true,
      destination: true,
      destinations: true,
      departureDate: true,
      tripType: true,
      creditHours: true,
      tafb: true,
      reportTime: true,
      aircraftType: true,
      blockHours: true,
      hasLayover: true,
      layoverCity: true,
      layoverHours: true,
      isManualEntry: true,
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
      isManualEntry?: boolean;
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
    expiresAt?: Date | null;
    source?: SwapPostInputSource;
    quickTrip?: QuickPostTripData;
    advanced?: QuickPostAdvancedData;
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
      wantAcceptanceOptions:
        data.wantCriteria.wantAcceptanceOptions?.length
          ? (data.wantCriteria.wantAcceptanceOptions as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
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
      expiresAt: data.expiresAt ?? undefined,
      inputSource: data.source ?? (data.swapPostTrips.length > 0 ? "SCHEDULE_PREFILL" : "MANUAL_QUICK"),
      quickTripType: data.quickTrip?.tripType,
      quickDestinations: data.quickTrip?.destinations ?? [],
      quickDate: data.quickTrip?.date ? new Date(data.quickTrip.date) : undefined,
      quickLayoverHours: data.quickTrip?.layoverHours ?? undefined,
      advancedReportTime: data.advanced?.reportTime ?? undefined,
      advancedAircraftTypeCode: data.advanced?.aircraftTypeCode ?? undefined,
      advancedBlockHours: data.advanced?.blockHours ?? undefined,
      advancedFlightNumber: data.advanced?.flightNumber ?? undefined,
      offeredTrips: data.swapPostTrips.length
        ? {
            create: data.swapPostTrips.map((t) => ({
              scheduleTripId: t.scheduleTripId ?? null,
              flightNumber: t.flightNumber ?? null,
              destination: t.destination,
              destinations: t.destinations ?? [],
              departureDate: t.departureDate,
              tripType: t.tripType,
              creditHours: t.creditHours ?? null,
              tafb: t.tafb ?? null,
              reportTime: t.reportTime ?? null,
              aircraftType: t.aircraftType ?? null,
              blockHours: t.blockHours ?? null,
              hasLayover: t.hasLayover,
              layoverCity: t.layoverCity,
              layoverHours: t.layoverHours,
              isManualEntry: t.isManualEntry ?? false,
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
    dateFrom?: string;
    excludeVacation?: boolean;
    routeType?: "DOMESTIC" | "INTERNATIONAL";
    rankId?: string;
    /** Default 20. Board match path uses 50 to over-fetch before percent filter. */
    take?: number;
    skip?: number;
  }
) {
  const where: {
    status: "OPEN";
    userId: { not: string };
    user: { baseId: string; rankId?: string };
    postType?: SwapPostType;
    NOT?: { postType: SwapPostType };
  } = {
    status: "OPEN",
    userId: { not: currentUserId },
    user: { baseId },
  };
  if (filters?.postType) where.postType = filters.postType;
  if (filters?.excludeVacation && !filters?.postType) where.NOT = { postType: "VACATION_SWAP" };
  if (filters?.postType === "VACATION_SWAP" && filters?.rankId) {
    where.user.rankId = filters.rankId;
  }

  const take = Math.min(200, Math.max(1, filters?.take ?? 20));
  const skip = Math.max(0, filters?.skip ?? 0);

  let posts: any[] = [];
  try {
    posts = await prisma.swapPost.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: "desc" },
      select: swapPostBoardSelect,
    });
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : null;
    // Backward compatibility: if DB migration for wantAcceptanceOptions hasn't been applied yet,
    // fall back to the legacy select so board cards still load.
    if (code !== "P2022") throw err;
    const legacyPosts = await prisma.swapPost.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: "desc" },
      select: {
        ...swapPostBoardSelect,
        wantAcceptanceOptions: false,
      },
    });
    posts = legacyPosts.map((post) => ({ ...post, wantAcceptanceOptions: null }));
  }

  let filtered = posts;
  if (filters?.tripType) {
    filtered = filtered.filter((p: any) =>
      p.offeredTrips.some((t: any) => t.tripType === filters.tripType) ||
      p.quickTripType === filters.tripType
    );
  }
  if (filters?.destination) {
    const wanted = filters.destination.toUpperCase();
    filtered = filtered.filter((p: any) =>
      p.offeredTrips.some((t: any) => t.destination.toUpperCase() === wanted) ||
      (p.quickDestinations ?? []).some((d: string) => d.toUpperCase() === wanted)
    );
  }

  if (filters?.dateFrom) {
    const fromDate = new Date(`${filters.dateFrom}T00:00:00.000Z`);
    if (!Number.isNaN(fromDate.getTime())) {
      filtered = filtered.filter((p: any) => {
        if (p.postType === "VACATION_SWAP") {
          if (p.vacationStartDate) return new Date(p.vacationStartDate) >= fromDate;
          if (p.vacationYear && p.vacationMonth && p.vacationStartDay) {
            const d = new Date(Date.UTC(p.vacationYear, p.vacationMonth - 1, p.vacationStartDay));
            return d >= fromDate;
          }
          return false;
        }
        return (
          p.offeredTrips.some((t: any) => new Date(t.departureDate) >= fromDate) ||
          (p.quickDate ? new Date(p.quickDate) >= fromDate : false)
        );
      });
    }
  }

  return filtered;
}

export async function findSwapPostsByUserId(
  userId: string,
  options?: { excludeCancelled?: boolean }
) {
  return prisma.swapPost.findMany({
    where: {
      userId,
      ...(options?.excludeCancelled ? { status: { notIn: ["CANCELLED", "EXPIRED"] } } : {}),
    },
    select: swapPostSelect,
    orderBy: { createdAt: "desc" },
  });
}

/** My Swaps — active listings only (`OPEN`). */
export async function findActiveSwapPostsByUserId(userId: string) {
  return prisma.swapPost.findMany({
    where: { userId, status: "OPEN" },
    select: swapPostSelect,
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Most recent active (`OPEN`) post for a user, with only the fields the matching engine needs.
 * Used by the mutual scorer so the viewer's wants (destinations, trip type, layover, wtfDays)
 * are factored into match percentages.
 */
export async function findActiveSwapPostForUser(userId: string) {
  return prisma.swapPost.findFirst({
    where: { userId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      postType: true,
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
      offeredTrips: {
        select: {
          id: true,
          destination: true,
          destinations: true,
          departureDate: true,
          tripType: true,
          creditHours: true,
          blockHours: true,
          hasLayover: true,
          layoverHours: true,
        },
      },
      quickTripType: true,
      quickDestinations: true,
      quickDate: true,
      quickLayoverHours: true,
    },
  });
}

export type ViewerActiveSwapPost = NonNullable<
  Awaited<ReturnType<typeof findActiveSwapPostForUser>>
>;

/**
 * My Swaps — past listings for history UI.
 * Includes terminal statuses plus OPEN posts that are already expired,
 * so users can still find older swaps before background expiry jobs run.
 */
export async function findHistorySwapPostsByUserId(userId: string, take = 30) {
  const rows = await prisma.swapPost.findMany({
    where: { userId },
    select: swapPostSelect,
    orderBy: { createdAt: "desc" },
    take: take * 3,
  });
  const now = new Date();
  return rows
    .filter((row) => {
      if (!swapPostHasDisplayableOffer(row)) return false;
      if (row.status === "EXPIRED" || row.status === "CANCELLED" || row.status === "COMPLETED") return true;
      return row.status === "OPEN" && isSwapPostExpired(row, now);
    })
    .slice(0, take);
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
      isManualEntry?: boolean;
    }[];
    vacationYear?: number;
    vacationMonth?: number;
    vacationStartDay?: number;
    vacationEndDay?: number;
    desiredVacationMonths?: number[];
    source?: SwapPostInputSource;
    quickTrip?: QuickPostTripData;
    advanced?: QuickPostAdvancedData;
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
    wantAcceptanceOptions:
      data.wantCriteria.wantAcceptanceOptions?.length
        ? (data.wantCriteria.wantAcceptanceOptions as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
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
  if (data.source !== undefined) updateData.inputSource = data.source;
  if (data.quickTrip !== undefined) {
    updateData.quickTripType = data.quickTrip.tripType;
    updateData.quickDestinations = data.quickTrip.destinations;
    updateData.quickDate = new Date(data.quickTrip.date);
    updateData.quickLayoverHours = data.quickTrip.layoverHours ?? null;
  }
  if (data.advanced !== undefined) {
    updateData.advancedReportTime = data.advanced.reportTime ?? null;
    updateData.advancedAircraftTypeCode = data.advanced.aircraftTypeCode ?? null;
    updateData.advancedBlockHours = data.advanced.blockHours ?? null;
    updateData.advancedFlightNumber = data.advanced.flightNumber ?? null;
  }

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
            scheduleTripId: t.scheduleTripId ?? null,
            flightNumber: t.flightNumber ?? null,
            destination: t.destination,
            destinations: t.destinations ?? [],
            departureDate: t.departureDate,
            tripType: t.tripType,
            creditHours: t.creditHours ?? null,
            tafb: t.tafb ?? null,
            reportTime: t.reportTime ?? null,
            aircraftType: t.aircraftType ?? null,
            blockHours: t.blockHours ?? null,
            hasLayover: t.hasLayover,
            layoverCity: t.layoverCity,
            layoverHours: t.layoverHours,
            isManualEntry: t.isManualEntry ?? false,
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
