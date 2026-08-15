// Load .env first, then .env.local (override) so the seed hits the same DB as Next.js.
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { getAllAirlineConfigs, saudiaConfig } from "../src/config/airlines";
import { ensurePgbouncerParamForPooler } from "../src/lib/prismaDatabaseUrl";
import type { AirlineConfig } from "../src/types/airline";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");

// Prisma 7 requires a driver adapter — mirror src/lib/prisma.ts.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: ensurePgbouncerParamForPooler(databaseUrl) }),
});

// Saudia-only history: rank codes that were renamed after users had already picked them.
const SAUDIA_LEGACY_RANK_CODES: Record<string, string> = {
  HST: "YC",
  STW: "YC",
  CHF: "CHEF",
  BTL: "BULTER",
  FO: "FRIST OFFICER",
  CPT: "CAPTAIN",
};

async function seedAirline(config: AirlineConfig) {
  const airline = await prisma.airline.upsert({
    where: { code: config.code },
    create: {
      name: config.name,
      code: config.code,
      emailDomain: config.emailDomain,
    },
    update: {},
  });

  const desiredCabinRanks = config.ranks.cabin.map((r) => ({
    ...r,
    category: "CABIN" as const,
  }));
  const desiredFlightDeckRanks = config.ranks.flightDeck.map((r) => ({
    ...r,
    category: "FLIGHT_DECK" as const,
  }));
  const desiredRanks = [...desiredCabinRanks, ...desiredFlightDeckRanks];
  const desiredRankCodes = new Set(desiredRanks.map((r) => r.code));

  for (const r of desiredRanks) {
    await prisma.rank.upsert({
      where: { airlineId_code: { airlineId: airline.id, code: r.code } },
      create: { airlineId: airline.id, name: r.name, code: r.code, category: r.category, sortOrder: r.sortOrder },
      update: { name: r.name, category: r.category, sortOrder: r.sortOrder },
    });
  }

  const ranksAfterUpsert = await prisma.rank.findMany({
    where: { airlineId: airline.id },
    select: { id: true, code: true },
  });
  const rankIdByCode = new Map(ranksAfterUpsert.map((r) => [r.code, r.id]));

  // Migrate users off deprecated rank codes before removing those rank rows.
  const legacyToNewCode = config.code === "SV" ? SAUDIA_LEGACY_RANK_CODES : {};
  for (const [legacyCode, newCode] of Object.entries(legacyToNewCode)) {
    const oldId = rankIdByCode.get(legacyCode);
    const newId = rankIdByCode.get(newCode);
    if (!oldId || !newId) continue;
    await prisma.user.updateMany({
      where: { airlineId: airline.id, rankId: oldId },
      data: { rankId: newId },
    });
  }

  const fallbackRankId = desiredRanks
    .map((r) => rankIdByCode.get(r.code))
    .find((id): id is string => typeof id === "string");

  const obsoleteRanks = await prisma.rank.findMany({
    where: {
      airlineId: airline.id,
      code: { notIn: Array.from(desiredRankCodes) },
    },
    select: { id: true, code: true },
  });
  for (const obsolete of obsoleteRanks) {
    if (fallbackRankId) {
      await prisma.user.updateMany({
        where: { airlineId: airline.id, rankId: obsolete.id },
        data: { rankId: fallbackRankId },
      });
    }
  }
  await prisma.rank.deleteMany({
    where: {
      airlineId: airline.id,
      code: { notIn: Array.from(desiredRankCodes) },
    },
  });

  for (const at of config.aircraftTypes) {
    await prisma.aircraftType.upsert({
      where: { airlineId_code: { airlineId: airline.id, code: at.code } },
      create: { airlineId: airline.id, name: at.name, code: at.code, scheduleCode: at.scheduleCode },
      update: {},
    });
  }

  for (const b of config.bases) {
    await prisma.base.upsert({
      where: { airlineId_airportCode: { airlineId: airline.id, airportCode: b.airportCode } },
      create: { airlineId: airline.id, name: b.name, airportCode: b.airportCode },
      update: {},
    });
  }

  console.log(`Seeded ${config.name} (${config.code}).`);
  return airline;
}

async function main() {
  for (const config of getAllAirlineConfigs()) {
    await seedAirline(config);
  }

  if (process.env.SEED_TEST_USER !== "true") {
    console.log("Seed complete.");
    return;
  }

  const airline = await prisma.airline.findUnique({ where: { code: saudiaConfig.code } });
  if (!airline) {
    console.log("Seed complete.");
    return;
  }
  const rank = await prisma.rank.findFirst({ where: { airlineId: airline.id, code: "SNF" } });
  const base = await prisma.base.findFirst({ where: { airlineId: airline.id, airportCode: "JED" } });
  const aircraft = await prisma.aircraftType.findFirst({ where: { airlineId: airline.id, code: "A330" } });
  if (rank && base && aircraft) {
    const passwordHash = await hash("Test123!", 10);
    await prisma.user.upsert({
      where: { email: "test@saudia.com" },
      create: {
        email: "test@saudia.com",
        passwordHash,
        firstName: "Test",
        lastName: "User",
        crewId: "SEED001",
        airlineId: airline.id,
        rankId: rank.id,
        baseId: base.id,
        qualifications: { create: [{ aircraftTypeId: aircraft.id }] },
      },
      update: {},
    });
    console.log("Test user test@saudia.com / Test123! created.");
  }

  console.log("Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
