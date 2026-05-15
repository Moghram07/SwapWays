/** Strip non-digits, re-add SV prefix. Returns null for empty/non-digit input. */
export function formatFlightNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  return digits ? `SV${digits}` : null;
}

/** For controlled inputs: keep only digits, max 4 characters. */
export function normalizeFlightNumberInput(input: string): string {
  return input.replace(/[^0-9]/g, "").slice(0, 4);
}
