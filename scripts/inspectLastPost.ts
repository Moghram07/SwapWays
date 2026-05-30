import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { prisma } from "../src/lib/prisma";

async function main() {
  const posts = await prisma.swapPost.findMany({
    where: { status: "OPEN" },
    select: {
      id: true, inputSource: true, createdAt: true,
      user: { select: { firstName: true, lastName: true } },
      offeredTrips: {
        select: {
          destination: true, tripType: true, scheduleTripId: true,
          scheduleTrip: { select: { legs: { select: { departureTime: true, arrivalTime: true, departureAirport: true, arrivalAirport: true }, orderBy: { legOrder: "asc" } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  console.log("Last 10 OPEN posts:\n");
  for (const p of posts) {
    const hasLegs = p.offeredTrips.some(t => t.scheduleTrip && t.scheduleTrip.legs.length > 0);
    const flag = p.inputSource === "MANUAL_QUICK" && hasLegs ? "⚠️  BUG" : "";
    console.log(`[${p.id.slice(-8)}] ${p.user.firstName} ${p.user.lastName} | source: ${p.inputSource ?? "null"} | hasLegs: ${hasLegs} | created: ${p.createdAt.toISOString().slice(0, 10)} ${flag}`);
    for (const t of p.offeredTrips) {
      console.log(`  trip dest: ${t.destination} | scheduleTripId: ${t.scheduleTripId ? t.scheduleTripId.slice(-8) : "null"}`);
      if (t.scheduleTrip && t.scheduleTrip.legs.length > 0) {
        for (const l of t.scheduleTrip.legs) {
          console.log(`    ${l.departureAirport} → ${l.arrivalAirport}  dep: ${l.departureTime}  arr: ${l.arrivalTime}`);
        }
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
