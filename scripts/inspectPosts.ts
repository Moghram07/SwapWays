import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { prisma } from "../src/lib/prisma";

async function main() {
  const posts = await prisma.swapPost.findMany({
    where: { status: "OPEN" },
    include: {
      offeredTrips: true,
      user: { select: { id: true, firstName: true, lastName: true, baseId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`\nTotal open posts: ${posts.length}\n`);

  for (const p of posts) {
    const tripDests = p.offeredTrips.map((t) => t.destination ?? "(null)");
    const quickDests = p.quickDestinations ?? [];
    const allDests = [...tripDests, ...quickDests];

    const hasJed = allDests.some((d) => d?.toUpperCase() === "JED");
    const hasNull = allDests.some((d) => !d || d.trim() === "" || d === "(null)");

    const flag = hasJed ? "🟡 HAS JED" : hasNull ? "🔴 NULL DEST" : "";

    const displayName = `${p.user.firstName ?? ""} ${p.user.lastName ?? ""}`.trim() || p.user.id.slice(-8);
    console.log(`${flag || "  "} [${p.id.slice(-8)}] ${displayName}`);
    console.log(`     tripDests: [${tripDests.join(", ")}]`);
    console.log(`     quickDests: [${quickDests.join(", ")}]`);
    console.log(`     quickTripType: ${p.quickTripType ?? "-"} | wantType: ${p.wantType}`);
    console.log(`     tripTypes: [${p.offeredTrips.map((t) => t.tripType).join(", ")}]`);
    console.log(`     createdAt: ${p.createdAt.toISOString()}`);
    console.log();
  }

  // Also check recently CLOSED/EXPIRED posts with JED destinations
  console.log("=== RECENT CLOSED POSTS WITH JED DESTINATION ===");
  const closedJed = await prisma.swapPost.findMany({
    where: {
      status: { not: "OPEN" },
      OR: [
        { offeredTrips: { some: { destination: { equals: "JED", mode: "insensitive" } } } },
        { quickDestinations: { has: "JED" } },
      ],
    },
    include: {
      offeredTrips: true,
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (closedJed.length === 0) {
    console.log("(none found)");
  }
  for (const p of closedJed) {
    console.log({
      postId: p.id.slice(-8),
      status: p.status,
      user: `${p.user.firstName ?? ""} ${p.user.lastName ?? ""}`.trim(),
      quickDests: p.quickDestinations,
      tripDests: p.offeredTrips.map((t) => t.destination),
      createdAt: p.createdAt.toISOString(),
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
