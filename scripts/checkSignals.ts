import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { prisma } from "../src/lib/prisma";

async function main() {
  // Show all OPEN posts with their wantType and trip types
  const posts = await prisma.swapPost.findMany({
    where: { status: "OPEN" },
    select: {
      id: true,
      userId: true,
      wantType: true,
      quickTripType: true,
      wantDestinations: true,
      offeredTrips: { select: { tripType: true, destination: true } },
      user: { select: { id: true } },
    },
  });

  console.log("\n=== OPEN POSTS (wantType + offered trip types) ===");
  for (const p of posts) {
    console.log({
      postId: p.id.slice(-8),
      userId: p.userId.slice(-8),
      wantType: p.wantType,
      quickTripType: p.quickTripType,
      wantDestinations: p.wantDestinations,
      offeredTripTypes: p.offeredTrips.map((t) => t.tripType),
      offeredDestinations: p.offeredTrips.map((t) => t.destination),
    });
  }

  // Show current MatchCache with reasons
  const cache = await prisma.matchCache.findMany({
    select: { postId: true, viewerId: true, matchPercent: true, reasons: true },
    orderBy: { matchPercent: "desc" },
    take: 20,
  });

  console.log("\n=== MATCH CACHE (top 20) ===");
  for (const c of cache) {
    console.log({
      postId: c.postId.slice(-8),
      viewerId: c.viewerId.slice(-8),
      matchPercent: c.matchPercent,
      reasons: c.reasons,
    });
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
