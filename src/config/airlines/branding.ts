import type { AirlineConfig } from "@/types/airline";

/**
 * Presentation-only airline branding for the marketing site.
 * Kept separate from `AirlineConfig`, which holds operational data (ranks, bases, fleet).
 */
export interface AirlineBrand {
  /** Rendered when `logoSrc` is unset. Keeps each carrier's own casing. */
  wordmark: string;
  /** Wordmark color. Approximate brand values — swap for official ones if you have them. */
  color: string;
  /**
   * Path to a logo under /public, e.g. "/images/airlines/flynas.png".
   * Leave unset until the file exists; the wordmark is used instead.
   */
  logoSrc?: string;
}

// Colors sampled by eye from each carrier's logo — replace with official brand values if you have them.
const brands: Record<string, AirlineBrand> = {
  SV: { wordmark: "Saudia", color: "#00693E", logoSrc: "/images/airlines/saudia.png" },
  XY: { wordmark: "flynas", color: "#00A8A4", logoSrc: "/images/airlines/flynas.png" },
  F3: { wordmark: "flyadeal", color: "#5F2B7B", logoSrc: "/images/airlines/flyadeal.png" },
  RX: { wordmark: "Riyadh Air", color: "#2D0B52", logoSrc: "/images/airlines/riyadhair.png" },
};

export function getAirlineBrand(airline: AirlineConfig): AirlineBrand {
  return brands[airline.code] ?? { wordmark: airline.name, color: "#0F172A" };
}
