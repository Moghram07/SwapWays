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

  for (const r of saudiaConfig.ranks.cabin) {
    await prisma.rank.upsert({
      where: { airlineId_code: { airlineId: airline.id, code: r.code } },
      create: { airlineId: airline.id, name: r.name, code: r.code, category: "CABIN", sortOrder: r.sortOrder },
      update: {},
    });
  }
  for (const r of saudiaConfig.ranks.flightDeck) {
    await prisma.rank.upsert({
      where: { airlineId_code: { airlineId: airline.id, code: r.code } },
      create: { airlineId: airline.id, name: r.name, code: r.code, category: "FLIGHT_DECK", sortOrder: r.sortOrder },
      update: {},
    });
  }

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
