import { prisma } from "@/lib/prisma";
import type { AirlineConfig } from "@/types/airline";

/**
 * Ensures an airline and its ranks, bases, and aircraft types exist.
 * Call this when a user tries to register with an airline the DB was never seeded with.
 */
export async function ensureAirlineExists(config: AirlineConfig): Promise<{ id: string } | null> {
  const existing = await prisma.airline.findUnique({ where: { code: config.code } });
  if (existing) return existing;

  let airline: { id: string };
  try {
    airline = await prisma.airline.create({
      data: {
        name: config.name,
        code: config.code,
        emailDomain: config.emailDomain,
      },
    });
  } catch {
    // Two crew registering for a brand-new airline at once: the loser of the race
    // re-reads the winner's row instead of failing the signup.
    return prisma.airline.findUnique({ where: { code: config.code } });
  }

  for (const r of config.ranks.cabin) {
    await prisma.rank.create({
      data: { airlineId: airline.id, name: r.name, code: r.code, category: "CABIN", sortOrder: r.sortOrder },
    });
  }
  for (const r of config.ranks.flightDeck) {
    await prisma.rank.create({
      data: { airlineId: airline.id, name: r.name, code: r.code, category: "FLIGHT_DECK", sortOrder: r.sortOrder },
    });
  }

  for (const at of config.aircraftTypes) {
    await prisma.aircraftType.create({
      data: { airlineId: airline.id, name: at.name, code: at.code, scheduleCode: at.scheduleCode },
    });
  }

  for (const b of config.bases) {
    await prisma.base.create({
      data: { airlineId: airline.id, name: b.name, airportCode: b.airportCode },
    });
  }

  return airline;
}
