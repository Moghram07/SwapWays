/** Airline used when the viewer's airline is unknown (e.g. a JWT issued before the claim existed). */
export const DEFAULT_AIRLINE_CODE = "SV";

/** Strip non-digits, re-add the airline prefix. Returns null for empty/non-digit input. */
export function formatFlightNumber(
  raw: string | null | undefined,
  airlineCode: string = DEFAULT_AIRLINE_CODE
): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  return digits ? `${airlineCode}${digits}` : null;
}

/** For controlled inputs: keep only digits, max 4 characters. */
export function normalizeFlightNumberInput(input: string): string {
  return input.replace(/[^0-9]/g, "").slice(0, 4);
}
