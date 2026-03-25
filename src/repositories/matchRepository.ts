import { prisma } from "@/lib/prisma";
import type { MatchStatus } from "@/types/enums";

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

export async function findMatchesByUserId(userId: string, status?: MatchStatus) {
  return prisma.match.findMany({
    where: { OR: [{ offererId: userId }, { receiverId: userId }], ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
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
