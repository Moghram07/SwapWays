/**
 * One-time / maintenance: normalize users to the free-days trial model.
 * - Base trial: 10 days from trialStartedAt (or createdAt)
 * - Cap: 60 days maximum from trialStartedAt
 * - Verification source: schedule presence
 *
 * Run with DATABASE_URL set: npx tsx scripts/backfill-tiers.ts
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      createdAt: true,
      trialStartedAt: true,
      trialEndsAt: true,
      subscriptionStatus: true,
      tier: true,
      trialExtended: true,
      referredBy: true,
      schedules: {
        select: { id: true, createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  let updated = 0;
  const dayMs = 24 * 60 * 60 * 1000;
  const baseDays = 10;
  const maxDays = 60;
  const now = Date.now();

  for (const user of users) {
    if (user.subscriptionStatus === "ACTIVE") continue;
    const trialStartedAt = user.trialStartedAt ?? user.createdAt;
    const minTrialEndsAt = new Date(trialStartedAt.getTime() + baseDays * dayMs);
    const capEndsAt = new Date(trialStartedAt.getTime() + maxDays * dayMs);
    const boundedCurrentEndsAt = user.trialEndsAt > capEndsAt ? capEndsAt : user.trialEndsAt;
    const trialEndsAt = boundedCurrentEndsAt > minTrialEndsAt ? boundedCurrentEndsAt : minTrialEndsAt;
    const firstSchedule = user.schedules[0];
    const isVerified = !!firstSchedule;
    const verifiedAt = firstSchedule?.createdAt ?? null;
    const trialExtended = user.trialExtended || isVerified;
    const isTrialing = trialEndsAt.getTime() > now;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        tier: isTrialing ? "PREMIUM" : "FREE",
        subscriptionStatus: isTrialing ? "TRIALING" : "EXPIRED",
        trialStartedAt,
        trialEndsAt,
        isVerified,
        verifiedAt,
        trialExtended,
        referredBy: user.referredBy ?? null,
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
