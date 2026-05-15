/**
 * One-time cleanup: strip any airline prefix (SV, DH, etc.) from stored
 * flight numbers so only digits remain.  The display layer adds "SV" at
 * render time.  Run once after deploying the formatFlightNumber changes:
 *
 *   npx tsx scripts/cleanup-flight-numbers.ts
 */

import { prisma } from "@/lib/prisma";

async function main() {
  let cleaned = 0;

  // SwapPostTrip.flightNumber — quick-post trips
  const trips = await prisma.swapPostTrip.findMany({
    where: { flightNumber: { not: null } },
    select: { id: true, flightNumber: true },
  });
  for (const t of trips) {
    const digits = (t.flightNumber ?? "").replace(/[^0-9]/g, "");
    if (digits !== t.flightNumber) {
      await prisma.swapPostTrip.update({
        where: { id: t.id },
        data: { flightNumber: digits || null },
      });
      cleaned++;
    }
  }

  // ScheduleTripLeg.flightNumber — uploaded schedule legs
  const legs = await prisma.scheduleTripLeg.findMany({
    where: { flightNumber: { not: "" } },
    select: { id: true, flightNumber: true },
  });
  for (const l of legs) {
    const digits = l.flightNumber.replace(/[^0-9]/g, "");
    if (digits !== l.flightNumber) {
      await prisma.scheduleTripLeg.update({
        where: { id: l.id },
        data: { flightNumber: digits },
      });
      cleaned++;
    }
  }

  console.log(`Cleaned ${cleaned} flight number records.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
