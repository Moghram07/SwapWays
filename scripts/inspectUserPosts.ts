import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { prisma } from "../src/lib/prisma";

async function main() {
  const email = process.argv[2];
  if (!email) { console.error("Usage: tsx scripts/inspectUserPosts.ts <email>"); process.exit(1); }

  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  if (!user) { console.log("User not found"); return; }
  console.log(`User: ${user.firstName} ${user.lastName} (${user.email})\n`);

  const posts = await prisma.swapPost.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, status: true, inputSource: true, postType: true, createdAt: true, notes: true,
      offeredTrips: {
        select: {
          id: true, tripType: true, destination: true, destinations: true,
          creditHours: true, blockHours: true, legDeadheads: true,
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

  if (posts.length === 0) { console.log("No posts found for this user."); return; }

  for (const post of posts) {
    console.log(`Post [${post.id}] status=${post.status} type=${post.postType} source=${post.inputSource} created=${post.createdAt.toISOString().slice(0,10)}`);
    if (post.notes) console.log(`  Notes: "${post.notes}"`);
    for (const t of post.offeredTrips) {
      console.log(`  Trip type=${t.tripType} dest=${t.destination} credit=${t.creditHours} block=${t.blockHours}`);
      const st = t.scheduleTrip;
      if (st) {
        console.log(`    ScheduleTrip: credit=${st.creditHours} block=${st.blockHours} type=${st.tripType}`);
        for (const l of st.legs) {
          const dh = l.flightNumber?.toUpperCase().startsWith("DH") ? " [DH]" : "";
          console.log(`    Leg ${l.legOrder}: ${l.flightNumber}${dh}  ${l.departureAirport}→${l.arrivalAirport}  dep:${l.departureTime} arr:${l.arrivalTime}  fly:${l.flyingTime}`);
        }
      } else {
        console.log(`    Manual entry (no schedule trip)`);
      }
    }
    console.log();
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
