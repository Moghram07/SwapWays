import { prisma } from "@/lib/prisma";
import type { CreateUserInput } from "@/types/user";

export async function createUser(data: CreateUserInput & { qualifications: { aircraftTypeId: string }[] }) {
  const { qualifications, ...userData } = data;
  return prisma.user.create({
    data: {
      ...userData,
      isAdmin: userData.isAdmin ?? false,
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
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { rank: true, base: true, airline: true, qualifications: { include: { aircraftType: true } } },
  });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { rank: true, base: true, airline: true, qualifications: { include: { aircraftType: true } } },
  });
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
