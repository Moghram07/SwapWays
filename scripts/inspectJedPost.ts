import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { prisma } from "../src/lib/prisma";

async function main() {
  // Get full detail on both problematic posts
  const postIds = ["bqpzcuyc", "e2gk600a", "98rrtktl"];

  for (const suffix of postIds) {
    const post = await prisma.swapPost.findFirst({
      where: { id: { endsWith: suffix } },
      include: {
        offeredTrips: {
          include: {
            scheduleTrip: { include: { legs: true } },
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            baseId: true,
            base: { select: { airportCode: true } },
          },
        },
      },
    });

    if (!post) {
      console.log(`Post ...${suffix} not found`);
      continue;
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`POST: ...${suffix}  (${post.user.firstName} ${post.user.lastName})`);
    console.log(`Base: ${post.user.base?.airportCode}`);
    console.log(`Status: ${post.status} | wantType: ${post.wantType}`);
    console.log(`quickTripType: ${post.quickTripType}`);
    console.log(`quickDestinations: [${(post.quickDestinations ?? []).join(", ")}]`);
    console.log(`quickDate: ${post.quickDate}`);
    console.log(`wtfDays: [${(post.wtfDays ?? []).join(", ")}]`);
    console.log(`wantDestinations: [${(post.wantDestinations ?? []).join(", ")}]`);
    console.log(`createdAt: ${post.createdAt.toISOString()}`);

    for (const t of post.offeredTrips) {
      console.log(`\n  OfferedTrip: ${t.id.slice(-8)}`);
      console.log(`    destination: ${t.destination}`);
      console.log(`    tripType: ${t.tripType}`);
      console.log(`    departureDate: ${t.departureDate}`);
      console.log(`    creditHours: ${t.creditHours} | blockHours: ${t.blockHours}`);
      console.log(`    hasLayover: ${t.hasLayover} | layoverHours: ${t.layoverHours}`);

      if (t.scheduleTrip) {
        console.log(`    scheduleTrip legs (${t.scheduleTrip.legs.length}):`);
        for (const leg of t.scheduleTrip.legs) {
          console.log(`      ${leg.departureAirport} → ${leg.arrivalAirport}  flight: ${leg.flightNumber}  aircraft: ${leg.aircraftTypeCode}`);
        }
      } else {
        console.log(`    scheduleTrip: (none — quick post)`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
