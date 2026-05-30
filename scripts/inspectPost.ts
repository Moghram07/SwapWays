import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { prisma } from "../src/lib/prisma";

async function main() {
  const arg = process.argv[2];
  if (!arg) { console.error("Usage: tsx scripts/inspectPost.ts <postId|email>"); process.exit(1); }

  const whereClause = arg.includes("@")
    ? { user: { email: arg } }
    : { id: { endsWith: arg } };

  const post = await prisma.swapPost.findFirst({
    where: { ...whereClause, offeredTrips: { some: { destination: "GVA" } } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, inputSource: true, createdAt: true,
      user: { select: { firstName: true, lastName: true, email: true } },
      offeredTrips: {
        select: {
          id: true, tripType: true, destination: true, destinations: true,
          creditHours: true, blockHours: true, legDeadheads: true, legLayovers: true,
          scheduleTripId: true,
          scheduleTrip: {
            select: {
              creditHours: true, blockHours: true, tripType: true,
              legs: {
                select: {
                  legOrder: true, flightNumber: true,
                  departureAirport: true, arrivalAirport: true,
                  departureTime: true, arrivalTime: true, flyingTime: true,
                },
                orderBy: { legOrder: "asc" }
              }
            }
          }
        }
      }
    }
  });

  if (!post) { console.log("Post not found"); return; }
  console.log(`Post ${post.id} — ${post.user.firstName} ${post.user.lastName} (${post.user.email})`);
  console.log(`Source: ${post.inputSource}  Created: ${post.createdAt.toISOString().slice(0, 10)}`);
  for (const t of post.offeredTrips) {
    console.log(`\n  Trip [${t.id}] type=${t.tripType} dest=${t.destination}`);
    console.log(`    creditHours: ${t.creditHours}  blockHours: ${t.blockHours}`);
    console.log(`    legDeadheads: ${JSON.stringify(t.legDeadheads)}`);
    const st = t.scheduleTrip;
    if (st) {
      console.log(`    ScheduleTrip creditHours: ${st.creditHours}  blockHours: ${st.blockHours}  type: ${st.tripType}`);
      for (const l of st.legs) {
        const dh = l.flightNumber?.toUpperCase().startsWith("DH") ? " [DH]" : "";
        console.log(`    Leg ${l.legOrder}: ${l.flightNumber}${dh}  ${l.departureAirport}→${l.arrivalAirport}  dep:${l.departureTime} arr:${l.arrivalTime}  flyingTime:${l.flyingTime}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
