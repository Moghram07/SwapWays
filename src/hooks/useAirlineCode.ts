"use client";

import { useSession } from "next-auth/react";
import { DEFAULT_AIRLINE_CODE } from "@/utils/flightNumber";

/**
 * IATA code of the signed-in user's airline, for flight-number prefixes.
 *
 * Safe as a viewer-wide value: boards, matches and chat only ever surface trips
 * from crew sharing the viewer's base, and `Base` rows are unique per airline —
 * so every flight number on screen belongs to the viewer's own airline.
 */
export function useAirlineCode(): string {
  const { data: session } = useSession();
  return session?.user?.airlineCode ?? DEFAULT_AIRLINE_CODE;
}
