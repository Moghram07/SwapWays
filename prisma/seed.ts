import { PrismaClient } from "../src/generated/prisma";
import { hash } from "bcryptjs";
import { saudiaConfig } from "../src/config/airlines/saudia";

const prisma = new PrismaClient();

async function main() {
  const airline = await prisma.airline.upsert({
    where: { code: "SV" },
    create: {
      name: saudiaConfig.name,
      code: saudiaConfig.code,
      emailDomain: saudiaConfig.emailDomain,
    },
    update: {},
  });

  const desiredCabinRanks = saudiaConfig.ranks.cabin.map((r) => ({
    ...r,
    category: "CABIN" as const,
  }));
  const desiredFlightDeckRanks = saudiaConfig.ranks.flightDeck.map((r) => ({
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
  const legacyToNewCode: Record<string, string> = {
    HST: "YC",
    STW: "YC",
    CHF: "CHEF",
    BTL: "BULTER",
    FO: "FRIST OFFICER",
    CPT: "CAPTAIN",
  };
  for (const [legacyCode, newCode] of Object.entries(legacyToNewCode)) {
    const oldId = rankIdByCode.get(legacyCode);
    const newId = rankIdByCode.get(newCode);
    if (!oldId || !newId) continue;
    await prisma.user.updateMany({
      where: { airlineId: airline.id, rankId: oldId },
      data: { rankId: newId },
    });
  }

  const fallbackRankId =
    rankIdByCode.get("YC") ??
    rankIdByCode.get("PC") ??
    desiredRanks
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

  for (const at of saudiaConfig.aircraftTypes) {
    await prisma.aircraftType.upsert({
      where: { airlineId_code: { airlineId: airline.id, code: at.code } },
      create: { airlineId: airline.id, name: at.name, code: at.code, scheduleCode: at.scheduleCode },
      update: {},
    });
  }

  for (const b of saudiaConfig.bases) {
    await prisma.base.upsert({
      where: { airlineId_airportCode: { airlineId: airline.id, airportCode: b.airportCode } },
      create: { airlineId: airline.id, name: b.name, airportCode: b.airportCode },
      update: {},
    });
  }

  const existingRules = await prisma.swapRule.findMany({ where: { airlineId: airline.id } });
  const existingTypes = new Set(existingRules.map((r: { ruleType: string }) => r.ruleType));
  for (const rule of saudiaConfig.swapRules) {
    if (!existingTypes.has(rule.ruleType)) {
      await prisma.swapRule.create({
        data: { airlineId: airline.id, ruleType: rule.ruleType, description: rule.description },
      });
    }
  }

  const rank = await prisma.rank.findFirst({ where: { airlineId: airline.id, code: "SNF" } });
  const base = await prisma.base.findFirst({ where: { airlineId: airline.id, airportCode: "JED" } });
  const aircraft = await prisma.aircraftType.findFirst({ where: { airlineId: airline.id, code: "A330" } });
  if (rank && base && aircraft && process.env.SEED_TEST_USER === "true") {
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
