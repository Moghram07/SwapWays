import { prisma } from "@/lib/prisma";
import { swapPostSelect } from "@/repositories/swapPostRepository";
import type { MatchStatus } from "@/types/enums";

const swapPostFullSelect = swapPostSelect;

type FindMatchesOptions = {
  status?: MatchStatus;
  take?: number;
  lightweight?: boolean;
};

export async function createMatch(data: {
  tradeId: string;
  offererId: string;
  receiverId: string;
  matchScore: number;
}) {
  return prisma.match.create({
    data: { ...data, status: "PENDING" },
    include: {
      trade: true,
      offerer: { include: { rank: true, base: true } },
      receiver: { include: { rank: true, base: true } },
    },
  });
}

export async function createOrRefreshPendingMatch(data: {
  tradeId: string;
  offererId: string;
  receiverId: string;
  matchScore: number;
}) {
  const existing = await prisma.match.findFirst({
    where: {
      tradeId: data.tradeId,
      offererId: data.offererId,
      receiverId: data.receiverId,
      status: "PENDING",
    },
  });

  if (existing) {
    return prisma.match.update({
      where: { id: existing.id },
      data: { matchScore: data.matchScore },
    });
  }

  return prisma.match.create({
    data: { ...data, status: "PENDING" },
  });
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: ["REJECTED"],
  REJECTED: [],
  EXPIRED: [],
};

export function isValidMatchStatusTransition(from: string, to: string): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

export async function findMatchesByUserId(userId: string, statusOrOptions?: MatchStatus | FindMatchesOptions) {
  const options: FindMatchesOptions =
    typeof statusOrOptions === "object" && statusOrOptions !== null
      ? statusOrOptions
      : { status: statusOrOptions };

  if (options.lightweight) {
    return prisma.match.findMany({
      where: { OR: [{ offererId: userId }, { receiverId: userId }], ...(options.status ? { status: options.status } : {}) },
      orderBy: { createdAt: "desc" },
      take: options.take,
      select: {
        id: true,
        status: true,
        createdAt: true,
        offererId: true,
        receiverId: true,
        trade: {
          select: {
            id: true,
            departureDate: true,
            destination: true,
            flightNumber: true,
            aircraftTypeCode: true,
            reportTime: true,
          },
        },
        offerer: { select: { firstName: true, lastName: true } },
        receiver: { select: { firstName: true, lastName: true } },
      },
    });
  }

  return prisma.match.findMany({
    where: { OR: [{ offererId: userId }, { receiverId: userId }], ...(options.status ? { status: options.status } : {}) },
    orderBy: { createdAt: "desc" },
    take: options.take,
    include: {
      trade: true,
      offerer: { select: { firstName: true, lastName: true, rank: { select: { name: true } }, base: { select: { name: true } } } },
      receiver: { select: { firstName: true, lastName: true, rank: { select: { name: true } }, base: { select: { name: true } } } },
    },
  });
}

export async function findMatchById(id: string) {
  return prisma.match.findUnique({
    where: { id },
    include: { trade: true, offerer: true, receiver: true },
  });
}

export async function updateMatchStatus(id: string, status: MatchStatus, rejectionReason?: string) {
  return prisma.match.update({
    where: { id },
    data: { status, rejectionReason, ...(status === "ACCEPTED" ? { confirmedAt: new Date() } : {}) },
  });
}

export async function countPendingMatchesForUser(userId: string) {
  return prisma.match.count({
    where: { OR: [{ offererId: userId }, { receiverId: userId }], status: "PENDING" },
  });
}

export async function findHighAffinityPostsForUser(userId: string, minPercent = 40, take = 20) {
  const rows = await prisma.matchCache.findMany({
    where: { viewerId: userId, matchPercent: { gte: minPercent } },
    orderBy: { matchPercent: "desc" },
    take,
    select: {
      postId: true,
      matchPercent: true,
      reasons: true,
    },
  });

  if (rows.length === 0) return [];

  const postIds = rows.map((r) => r.postId);
  const posts = await prisma.swapPost.findMany({
    where: { id: { in: postIds }, status: "OPEN" },
    select: swapPostFullSelect,
  });

  const postMap = new Map(posts.map((p) => [p.id, p]));
  const matchMap = new Map(rows.map((r) => [r.postId, r]));

  return postIds
    .map((postId) => {
      const post = postMap.get(postId);
      const cache = matchMap.get(postId);
      if (!post || !cache) return null;
      return {
        ...post,
        matchPercent: cache.matchPercent,
        matchReasons: cache.reasons,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}
