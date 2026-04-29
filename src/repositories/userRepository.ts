import { prisma } from "@/lib/prisma";
import type { CreateUserInput } from "@/types/user";

function isTransientPrismaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeCode = "code" in error ? (error as { code?: string }).code : undefined;
  return maybeCode === "P1008" || maybeCode === "P1001" || maybeCode === "P1002";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTransientRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientPrismaError(error) || attempt === retries) {
        throw error;
      }
      await sleep(250 * (attempt + 1));
    }
  }
  throw lastError;
}

export async function createUser(data: CreateUserInput & { qualifications: { aircraftTypeId: string }[] }) {
  const { qualifications, ...userData } = data;
  const trialStartedAt = userData.trialStartedAt ?? new Date();
  const trialEndsAt =
    userData.trialEndsAt ?? new Date(trialStartedAt.getTime() + 10 * 24 * 60 * 60 * 1000);
  return prisma.user.create({
    data: {
      ...userData,
      isAdmin: userData.isAdmin ?? false,
      tier: userData.tier ?? "PREMIUM",
      trialStartedAt,
      trialEndsAt,
      subscriptionStatus: userData.subscriptionStatus ?? "TRIALING",
      subscribedAt: userData.subscribedAt,
      subscriptionRenewsAt: userData.subscriptionRenewsAt,
      cancelledAt: userData.cancelledAt,
      qualifications: { create: qualifications.map((q) => ({ aircraftTypeId: q.aircraftTypeId })) },
    },
    include: {
      rank: true,
      base: true,
      qualifications: { include: { aircraftType: true } },
    },
  });
}

export async function findUserByEmail(email: string) {
  return withTransientRetry(() =>
    prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { rank: true, base: true, airline: true, qualifications: { include: { aircraftType: true } } },
    })
  );
}

export async function findUserById(id: string) {
  return withTransientRetry(() =>
    prisma.user.findUnique({
      where: { id },
      include: { rank: true, base: true, airline: true, qualifications: { include: { aircraftType: true } } },
    })
  );
}

export async function userExistsById(id: string) {
  const user = await withTransientRetry(() =>
    prisma.user.findUnique({
      where: { id },
      select: { id: true },
    })
  );
  return !!user;
}

export async function updateUser(
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatarUrl?: string;
    rankId?: string;
    baseId?: string;
    hasUsVisa?: boolean;
    hasChinaVisa?: boolean;
    emailVerified?: Date;
  }
) {
  return prisma.user.update({
    where: { id },
    data,
    include: { rank: true, base: true, qualifications: { include: { aircraftType: true } } },
  });
}

export async function setUserQualifications(userId: string, aircraftTypeIds: string[]) {
  await prisma.userQualification.deleteMany({ where: { userId } });
  if (aircraftTypeIds.length > 0) {
    await prisma.userQualification.createMany({
      data: aircraftTypeIds.map((aircraftTypeId) => ({ userId, aircraftTypeId })),
    });
  }
  return findUserById(userId);
}
