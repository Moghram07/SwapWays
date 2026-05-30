import type { TripOption } from "@/components/swap-post/TripSelector";

export function getScheduledDaysFromTrips(
  trips: TripOption[],
  month: number,
  year: number
): number[] {
  const set = new Set<number>();
  const monthStartUtc = Date.UTC(year, month - 1, 1);
  const monthEndUtc = Date.UTC(year, month, 1); // exclusive

  for (const t of trips) {
    const start = new Date(t.startDate);
    const lastLeg = t.legs[t.legs.length - 1];
    const end =
      lastLeg?.arrivalDate != null ? new Date(lastLeg.arrivalDate) : start;

    const startDayUtc = Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate()
    );
    const endDayUtc = Date.UTC(
      end.getUTCFullYear(),
      end.getUTCMonth(),
      end.getUTCDate()
    );

    const rangeStartUtc = Math.min(startDayUtc, endDayUtc);
    const rangeEndUtc = Math.max(startDayUtc, endDayUtc);

    if (rangeEndUtc < monthStartUtc || rangeStartUtc >= monthEndUtc) continue;

    const clampedStartUtc = Math.max(rangeStartUtc, monthStartUtc);
    const clampedEndUtc = Math.min(rangeEndUtc, monthEndUtc - 24 * 60 * 60 * 1000);

    for (
      let dayUtc = clampedStartUtc;
      dayUtc <= clampedEndUtc;
      dayUtc += 24 * 60 * 60 * 1000
    ) {
      set.add(new Date(dayUtc).getUTCDate());
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}
