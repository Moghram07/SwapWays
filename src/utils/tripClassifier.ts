/**
 * Classify trip type from legs and layovers for display and rules.
 */

export type TripType = "LAYOVER" | "TURNAROUND" | "MULTI_STOP";

export interface TripTypeInfo {
  type: TripType;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: string;
}

export function getUniqueDestinations(
  trip: {
    legs: { departureAirport: string; arrivalAirport: string }[];
  }
): string[] {
  const base = trip.legs[0]?.departureAirport;
  if (!base) return [];
  const destinations = new Set<string>();
  for (const leg of trip.legs) {
    if (leg.departureAirport !== base) destinations.add(leg.departureAirport);
    if (leg.arrivalAirport !== base) destinations.add(leg.arrivalAirport);
  }
  return Array.from(destinations);
}

export function classifyTrip(trip: {
  legs: unknown[];
  layovers?: unknown[];
}): TripType {
  if (trip.layovers && trip.layovers.length > 0) return "LAYOVER";
  const destinations = getUniqueDestinations(
    trip as { legs: { departureAirport: string; arrivalAirport: string }[] }
  );
  if (trip.legs.length > 2 || destinations.length > 1) return "MULTI_STOP";
  return "TURNAROUND";
}

export function getTripTypeInfo(type: TripType): TripTypeInfo {
  switch (type) {
    case "LAYOVER":
      return {
        type: "LAYOVER",
        label: "Layover",
        bgColor: "bg-[#E8F5EA]",
        textColor: "text-[#3BA34A]",
        borderColor: "border-l-[#3BA34A]",
        icon: "Moon",
      };
    case "TURNAROUND":
      return {
        type: "TURNAROUND",
        label: "Round Trip",
        bgColor: "bg-[#E3EFF9]",
        textColor: "text-[#2668B0]",
        borderColor: "border-l-[#2668B0]",
        icon: "RotateCcw",
      };
    case "MULTI_STOP":
      return {
        type: "MULTI_STOP",
        label: "Multi-Stop",
        bgColor: "bg-amber-50",
        textColor: "text-amber-700",
        borderColor: "border-l-amber-500",
        icon: "Route",
      };
  }
}
