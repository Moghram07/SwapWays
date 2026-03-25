const US_VISA_DESTINATIONS = ["JFK", "IAD"] as const;
const CHINA_VISA_DESTINATIONS = ["CAN", "PKX"] as const;

type TripLegAirports = { departureAirport: string; arrivalAirport: string };

export function getRequiredVisa(destinationCode: string): "US" | "CHINA" | null {
  const code = destinationCode.toUpperCase();
  if (US_VISA_DESTINATIONS.includes(code as (typeof US_VISA_DESTINATIONS)[number])) return "US";
  if (CHINA_VISA_DESTINATIONS.includes(code as (typeof CHINA_VISA_DESTINATIONS)[number])) return "CHINA";
  return null;
}

export function tripRequiresVisa(
  legs: TripLegAirports[]
): { requiresUs: boolean; requiresChina: boolean } {
  let requiresUs = false;
  let requiresChina = false;

  for (const leg of legs) {
    const dep = leg.departureAirport.toUpperCase();
    const arr = leg.arrivalAirport.toUpperCase();
    if (US_VISA_DESTINATIONS.includes(dep as (typeof US_VISA_DESTINATIONS)[number])) requiresUs = true;
    if (US_VISA_DESTINATIONS.includes(arr as (typeof US_VISA_DESTINATIONS)[number])) requiresUs = true;
    if (CHINA_VISA_DESTINATIONS.includes(dep as (typeof CHINA_VISA_DESTINATIONS)[number])) requiresChina = true;
    if (CHINA_VISA_DESTINATIONS.includes(arr as (typeof CHINA_VISA_DESTINATIONS)[number])) requiresChina = true;
  }

  return { requiresUs, requiresChina };
}

export function userHasRequiredVisas(
  user: { hasUsVisa: boolean; hasChinaVisa: boolean },
  tripVisas: { requiresUs: boolean; requiresChina: boolean }
): boolean {
  if (tripVisas.requiresUs && !user.hasUsVisa) return false;
  if (tripVisas.requiresChina && !user.hasChinaVisa) return false;
  return true;
}
