import { prisma } from "@/lib/prisma";
import { saudiaConfig } from "@/config/airlines/saudia";

/**
 * Ensures Saudia airline and its ranks, bases, and aircraft types exist.
 * Call this when a user tries to register with Saudia (SV) but the DB was never seeded.
 */
export async function ensureSaudiaExists(): Promise<{ id: string } | null> {
  const existing = await prisma.airline.findUnique({ where: { code: "SV" } });
  if (existing) return existing;

  const airline = await prisma.airline.create({
    data: {
      name: saudiaConfig.name,
      code: saudiaConfig.code,
      emailDomain: saudiaConfig.emailDomain,
    },
  });

  for (const r of saudiaConfig.ranks.cabin) {
    await prisma.rank.create({
      data: { airlineId: airline.id, name: r.name, code: r.code, category: "CABIN", sortOrder: r.sortOrder },
    });
  }
  for (const r of saudiaConfig.ranks.flightDeck) {
    await prisma.rank.create({
      data: { airlineId: airline.id, name: r.name, code: r.code, category: "FLIGHT_DECK", sortOrder: r.sortOrder },
    });
  }

  for (const at of saudiaConfig.aircraftTypes) {
    await prisma.aircraftType.create({
      data: { airlineId: airline.id, name: at.name, code: at.code, scheduleCode: at.scheduleCode },
    });
  }

  for (const b of saudiaConfig.bases) {
    await prisma.base.create({
      data: { airlineId: airline.id, name: b.name, airportCode: b.airportCode },
    });
  }

  return airline;
}
