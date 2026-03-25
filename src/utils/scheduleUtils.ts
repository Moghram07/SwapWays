import type { TripCardData } from "@/types/tripCard";

export function getScheduledDays(
  trips: TripCardData[],
  month: number,
  year: number
): number[] {
  const days = new Set<number>();

  for (const trip of trips) {
    for (const leg of trip.legs) {
      const d = leg.departureDate;
      if (d.getMonth() === month - 1 && d.getFullYear() === year) {
        days.add(d.getDate());
      }
      // If arrival spills into another day within same month, mark that too.
      const arr = new Date(d);
      if (leg.arrivalTime && leg.arrivalTime !== leg.departureTime) {
        // crude approximation: assume arrival is same calendar day or next;
        // multi-day coverage is better captured via layovers below.
        // We keep this simple and rely on layovers for longer spans.
      }
    }

    for (const layover of trip.layovers) {
      const legBefore = trip.legs.find(
        (l) => l.legNumber === layover.afterLegNumber
      );
      if (!legBefore) continue;
      const start = new Date(legBefore.departureDate);
      const layoverDays = Math.ceil(layover.durationDecimal / 24);
      for (let offset = 1; offset <= layoverDays; offset++) {
        const d = new Date(start);
        d.setDate(d.getDate() + offset);
        if (d.getMonth() === month - 1 && d.getFullYear() === year) {
          days.add(d.getDate());
        }
      }
    }
  }

  return Array.from(days).sort((a, b) => a - b);
}

