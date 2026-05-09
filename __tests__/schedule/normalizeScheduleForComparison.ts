/**
 * Normalized trip comparison for LINE vs CrewTool calendar (tests only).
 */

import type { ParsedLayover, ParsedTrip } from "@/types/schedule";

export interface NormalizedLeg {
  date: string;
  flightKey: string;
  departureAirport: string;
  arrivalAirport: string;
}

export interface NormalizedTrip {
  legs: NormalizedLeg[];
  layovers: string[];
}

function flightSortKey(flightNumber: string): string {
  const digits = flightNumber.replace(/\D/g, "");
  return digits.padStart(4, "0");
}

/** Strip airline prefix so SA0383 and SV0383 align. */
export function normalizeForComparison(trips: ParsedTrip[]): NormalizedTrip[] {
  return trips
    .map((trip) => ({
      legs: trip.legs
        .map((l) => {
          const dep = l.departureDate!;
          const date = dep.toISOString().split("T")[0]!;
          return {
            date,
            flightKey: flightSortKey(l.flightNumber),
            departureAirport: l.departureAirport.toUpperCase(),
            arrivalAirport: l.arrivalAirport.toUpperCase(),
          };
        })
        .sort((a, b) => {
          const c = a.date.localeCompare(b.date);
          if (c !== 0) return c;
          return a.flightKey.localeCompare(b.flightKey);
        }),
      layovers: (trip.layovers ?? []).map((lo: ParsedLayover) => lo.airport.toUpperCase()).sort(),
    }))
    .sort((a, b) => {
      const da = a.legs[0]?.date ?? "";
      const db = b.legs[0]?.date ?? "";
      const c = da.localeCompare(db);
      if (c !== 0) return c;
      return (a.legs[0]?.flightKey ?? "").localeCompare(b.legs[0]?.flightKey ?? "");
    });
}
