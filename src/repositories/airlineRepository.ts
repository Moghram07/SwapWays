import { prisma } from "@/lib/prisma";

export async function findAirlineByCode(code: string) {
  return prisma.airline.findUnique({ where: { code } });
}

export async function findAirlineByEmailDomain(emailDomain: string) {
  return prisma.airline.findUnique({ where: { emailDomain } });
}

export async function getRanksByAirlineId(airlineId: string) {
  return prisma.rank.findMany({
    where: { airlineId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getAircraftTypesByAirlineId(airlineId: string) {
  return prisma.aircraftType.findMany({
    where: { airlineId },
    orderBy: { code: "asc" },
  });
}

export async function getBasesByAirlineId(airlineId: string) {
  return prisma.base.findMany({
    where: { airlineId },
    orderBy: { airportCode: "asc" },
  });
}
