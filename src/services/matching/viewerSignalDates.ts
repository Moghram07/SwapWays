import { expandDayOfMonthToKeysInMonth } from "./dateMatch";

function referenceMonthYearFromPost(post: {
  offeredTrips: { departureDate: Date | null }[];
  quickDate?: Date | null;
}): { year: number; month: number } | null {
  const first = post.offeredTrips[0]?.departureDate ?? post.quickDate ?? null;
  if (!first) return null;
  return { year: first.getUTCFullYear(), month: first.getUTCMonth() + 1 };
}

export function expandPostWtfToDateKeys(post: {
  wtfDays: number[];
  offeredTrips: { departureDate: Date | null }[];
  quickDate?: Date | null;
}): Set<string> {
  const ref = referenceMonthYearFromPost(post);
  if (!ref || post.wtfDays.length === 0) return new Set();
  return new Set(expandDayOfMonthToKeysInMonth(ref.year, ref.month, post.wtfDays));
}
