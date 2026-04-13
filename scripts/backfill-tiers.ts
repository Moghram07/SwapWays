import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, createdAt: true },
  });

  let updated = 0;
  const now = Date.now();

  for (const user of users) {
    const trialStartedAt = user.createdAt;
    const trialEndsAt = new Date(trialStartedAt.getTime() + 90 * 24 * 60 * 60 * 1000);
    const isTrialing = trialEndsAt.getTime() > now;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        tier: isTrialing ? "PREMIUM" : "FREE",
        subscriptionStatus: isTrialing ? "TRIALING" : "EXPIRED",
        trialStartedAt,
        trialEndsAt,
      },
    });
    updated += 1;
  }

  console.log(`Backfilled ${updated} users`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
