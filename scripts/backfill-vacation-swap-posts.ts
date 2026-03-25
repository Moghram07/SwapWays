/**
 * One-time backfill: set vacationYear, vacationMonth, vacationStartDay, vacationEndDay,
 * and desiredVacationMonths on existing VACATION_SWAP SwapPosts from the legacy
 * vacationStartDate, vacationEndDate, desiredVacationStart, desiredVacationEnd.
 *
 * Run with DATABASE_URL set: npx tsx scripts/backfill-vacation-swap-posts.ts
 */

import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.swapPost.findMany({
    where: {
      postType: "VACATION_SWAP",
      vacationStartDate: { not: null },
    },
    select: {
      id: true,
      vacationStartDate: true,
      vacationEndDate: true,
      desiredVacationStart: true,
      desiredVacationEnd: true,
      vacationYear: true,
      vacationMonth: true,
      desiredVacationMonths: true,
    },
  });

  let updated = 0;
  for (const post of posts) {
    const start = post.vacationStartDate;
    const end = post.vacationEndDate;
    const wantStart = post.desiredVacationStart;
    const wantEnd = post.desiredVacationEnd;

    const alreadyHasBlock =
      post.vacationYear != null &&
      post.vacationMonth != null &&
      Array.isArray(post.desiredVacationMonths) &&
      post.desiredVacationMonths.length > 0;
    if (alreadyHasBlock) continue;

    const vacationYear = start ? start.getUTCFullYear() : null;
    const vacationMonth = start ? start.getUTCMonth() + 1 : null;
    const vacationStartDay = start ? start.getUTCDate() : null;
    const vacationEndDay = end ? end.getUTCDate() : null;

    const desiredMonths: number[] = [];
    if (wantStart) desiredMonths.push(wantStart.getUTCMonth() + 1);
    if (wantEnd && !desiredMonths.includes(wantEnd.getUTCMonth() + 1)) {
      desiredMonths.push(wantEnd.getUTCMonth() + 1);
    }
    desiredMonths.sort((a, b) => a - b);

    await prisma.swapPost.update({
      where: { id: post.id },
      data: {
        ...(vacationYear != null && { vacationYear }),
        ...(vacationMonth != null && { vacationMonth }),
        ...(vacationStartDay != null && { vacationStartDay }),
        ...(vacationEndDay != null && { vacationEndDay }),
        ...(desiredMonths.length > 0 && { desiredVacationMonths: desiredMonths }),
      },
    });
    updated++;
  }

  console.log(`Backfilled ${updated} of ${posts.length} vacation swap posts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
