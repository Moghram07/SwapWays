/**
 * Cancel duplicate OPEN OFFERING_TRIPS posts for one user (identical offered-trip fingerprint sets).
 * Keeps the oldest post per duplicate group; sets others to CANCELLED.
 *
 *   npx tsx scripts/dedupe-open-swap-posts.ts --email=user@example.com
 *   npx tsx scripts/dedupe-open-swap-posts.ts --user-id=<cuid> --apply
 *
 * Without --apply: dry run (prints actions only).
 * Loads .env.local / .env so DATABASE_URL matches local dev.
 */

import { config } from "dotenv";
import { resolve } from "node:path";
import { offeredTripFingerprintFromStored, looseManualMultiStopPostKeyFromTrips } from "../src/lib/swapPostOfferDedupe";

function loadEnv() {
  config({ path: resolve(process.cwd(), ".env.local") });
  config({ path: resolve(process.cwd(), ".env") });
}

function parseArgs() {
  const args = process.argv.slice(2);
  let email: string | undefined;
  let userId: string | undefined;
  let apply = false;
  for (const a of args) {
    if (a === "--apply") apply = true;
    else if (a.startsWith("--email=")) email = a.slice("--email=".length).trim();
    else if (a.startsWith("--user-id=")) userId = a.slice("--user-id=".length).trim();
  }
  return { email, userId, apply };
}

function postOfferKey(
  trips: Array<{
    scheduleTripId: string | null;
    departureDate: Date;
    tripType: string;
    reportTime: string | null;
    destinations: string[];
    destination: string;
    flightNumber: string | null;
    layoverHours: number | null;
  }>
): string {
  if (trips.length === 0) return "empty";
  const fps = trips.map((t) =>
    offeredTripFingerprintFromStored({
      scheduleTripId: t.scheduleTripId,
      departureDate: t.departureDate,
      tripType: t.tripType as "LAYOVER" | "TURNAROUND" | "MULTI_STOP",
      reportTime: t.reportTime,
      destinations: t.destinations,
      destination: t.destination,
      flightNumber: t.flightNumber,
      layoverHours: t.layoverHours,
    })
  );
  fps.sort();
  return fps.join("#");
}

async function main() {
  loadEnv();
  const { prisma } = await import("../src/lib/prisma");

  try {
    const { email, userId: argUserId, apply } = parseArgs();
    if (!email && !argUserId) {
      console.error("Usage: npx tsx scripts/dedupe-open-swap-posts.ts --email=you@example.com [--apply]");
      console.error("   or: npx tsx scripts/dedupe-open-swap-posts.ts --user-id=<id> [--apply]");
      process.exit(1);
    }

    let userId = argUserId;
    if (!userId && email) {
      const user = await prisma.user.findFirst({
        where: { email: email.toLowerCase() },
        select: { id: true, email: true },
      });
      if (!user) {
        console.error(`No user with email: ${email}`);
        process.exit(1);
      }
      userId = user.id;
      console.log(`Resolved user ${user.email} -> ${userId}`);
    }

    if (!userId) {
      console.error("Missing user id");
      process.exit(1);
    }

    const posts = await prisma.swapPost.findMany({
      where: {
        userId,
        status: "OPEN",
        postType: "OFFERING_TRIPS",
      },
      select: {
        id: true,
        createdAt: true,
        offeredTrips: {
          select: {
            scheduleTripId: true,
            departureDate: true,
            tripType: true,
            reportTime: true,
            destinations: true,
            destination: true,
            flightNumber: true,
            layoverHours: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const byKey = new Map<string, typeof posts>();
    for (const p of posts) {
      const key = postOfferKey(p.offeredTrips);
      const list = byKey.get(key) ?? [];
      list.push(p);
      byKey.set(key, list);
    }

    const byLoose = new Map<string, typeof posts>();
    for (const p of posts) {
      const lk = looseManualMultiStopPostKeyFromTrips(
        p.offeredTrips.map((t) => ({
          scheduleTripId: t.scheduleTripId,
          tripType: t.tripType,
          departureDate: t.departureDate,
          destinations: t.destinations,
          destination: t.destination,
        }))
      );
      if (!lk) continue;
      const list = byLoose.get(lk) ?? [];
      list.push(p);
      byLoose.set(lk, list);
    }

    const toCancelSet = new Set<string>();
    const noteCancel = (group: typeof posts, label: string) => {
      if (group.length < 2) return;
      const sorted = [...group].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const keep = sorted[0]!;
      const dupes = sorted.slice(1);
      const preview = label.length > 56 ? `${label.slice(0, 56)}…` : label;
      console.log(
        `\nDuplicate group (${group.length} OPEN posts, ${preview}):\n  KEEP ${keep.id} created ${keep.createdAt.toISOString()}`
      );
      for (const d of dupes) {
        console.log(`  CANCEL ${d.id} created ${d.createdAt.toISOString()}`);
        toCancelSet.add(d.id);
      }
    };

    for (const [key, group] of byKey) {
      noteCancel(group, `strict ${key}`);
    }
    for (const [lk, group] of byLoose) {
      noteCancel(group, `loose ${lk}`);
    }

    const toCancel = [...toCancelSet];

    if (toCancel.length === 0) {
      console.log("\nNo duplicate OPEN flight-swap posts found for this user.");
      return;
    }

    if (!apply) {
      console.log(`\nDry run only. Re-run with --apply to cancel ${toCancel.length} duplicate post(s).`);
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.matchCache.deleteMany({ where: { postId: { in: toCancel } } });
      await tx.swapPost.updateMany({
        where: { id: { in: toCancel } },
        data: { status: "CANCELLED" },
      });
    });

    await prisma.matchCache.deleteMany({ where: { viewerId: userId } }).catch(() => {});

    console.log(`\nCancelled ${toCancel.length} duplicate post(s). Kept oldest post per offer group.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
