/**
 * One-time / maintenance: align tier + trial fields from account creation date.
 * Skips users with ACTIVE paid subscription so Phase 2 subscribers are not overwritten.
 *
 * Run with DATABASE_URL set: npx tsx scripts/backfill-tiers.ts
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    where: {
      NOT: { subscriptionStatus: "ACTIVE" },
    },
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
    try {
      await prisma.$disconnect();
    } catch {
      // ignore
    }
    process.exit(1);
  });
