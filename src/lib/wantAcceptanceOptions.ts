import type { WantAcceptanceOption } from "@/types/swapPost";

const IATA = /^[A-Z]{3}$/;
const MAX_ALTERNATIVES = 8;
const MAX_CODES_PER_ALT = 5;

function normalizeCodes(codes: unknown): string[] {
  if (!Array.isArray(codes)) return [];
  return codes
    .map((s) => String(s).trim().toUpperCase())
    .filter((c) => IATA.test(c))
    .slice(0, MAX_CODES_PER_ALT);
}

export type NormalizeWantAcceptanceResult =
  | { ok: true; value: WantAcceptanceOption[] | null }
  | { ok: false; message: string };

/** Normalize client/API payload into DB-safe JSON (empty → null). */
export function normalizeWantAcceptanceOptions(raw: unknown): NormalizeWantAcceptanceResult {
  if (raw == null) return { ok: true, value: null };
  if (!Array.isArray(raw)) return { ok: false, message: "wantAcceptanceOptions must be an array" };
  const out: WantAcceptanceOption[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const airportCodes = normalizeCodes(o.airportCodes);
    if (airportCodes.length === 0) continue;
    let minBlockHours: number | null | undefined;
    if (o.minBlockHours != null && o.minBlockHours !== "") {
      const n = Number(o.minBlockHours);
      if (Number.isFinite(n) && n >= 0 && n <= 99) minBlockHours = n;
      else return { ok: false, message: "Invalid minBlockHours in wantAcceptanceOptions" };
    }
    let maxBlockHours: number | null | undefined;
    if (o.maxBlockHours != null && o.maxBlockHours !== "") {
      const n = Number(o.maxBlockHours);
      if (Number.isFinite(n) && n >= 0 && n <= 99) maxBlockHours = n;
      else return { ok: false, message: "Invalid maxBlockHours in wantAcceptanceOptions" };
    }
    if (
      minBlockHours != null &&
      maxBlockHours != null &&
      minBlockHours > maxBlockHours
    ) {
      return { ok: false, message: "minBlockHours cannot exceed maxBlockHours" };
    }
    out.push({
      airportCodes,
      minBlockHours: minBlockHours ?? null,
      maxBlockHours: maxBlockHours ?? null,
    });
    if (out.length >= MAX_ALTERNATIVES) break;
  }
  return { ok: true, value: out.length ? out : null };
}

/** Parse Prisma Json value for API/card (best-effort). */
export function parseWantAcceptanceOptions(json: unknown): WantAcceptanceOption[] {
  const res = normalizeWantAcceptanceOptions(json);
  if (!res.ok) return [];
  return res.value ?? [];
}

export function notesLookLikeSpecificSwapProposal(notes: string, wantType: string): boolean {
  if (wantType !== "ANYTHING") return false;
  const t = notes.trim();
  if (t.length < 4) return false;
  if (!/\b[A-Z]{3}\b/i.test(t)) return false;
  if (!/\d/.test(t)) return false;
  return true;
}
