import type { AirlineConfig } from "@/types/airline";
import { saudiaConfig } from "./saudia";
import { flynasConfig } from "./flynas";
import { flyadealConfig } from "./flyadeal";
import { riyadhAirConfig } from "./riyadhair";

/** Display order in the signup picker. */
const airlineConfigs: AirlineConfig[] = [saudiaConfig, flynasConfig, flyadealConfig, riyadhAirConfig];

const airlineRegistry: Record<string, AirlineConfig> = {
  SV: saudiaConfig,
  saudia: saudiaConfig,
  XY: flynasConfig,
  flynas: flynasConfig,
  F3: flyadealConfig,
  flyadeal: flyadealConfig,
  RX: riyadhAirConfig,
  "riyadh air": riyadhAirConfig,
};

export function getAirlineConfig(codeOrName: string): AirlineConfig | undefined {
  return airlineRegistry[codeOrName.toUpperCase()] ?? airlineRegistry[codeOrName.toLowerCase()];
}

export function getAllAirlineConfigs(): AirlineConfig[] {
  return airlineConfigs;
}

/** Airport codes a user may pick at signup/profile. Falls back to every base the airline has. */
export function getRegistrationBases(config: AirlineConfig) {
  const allowed = config.registrationBaseCodes;
  if (!allowed) return config.bases;
  return config.bases.filter((b) => allowed.includes(b.airportCode));
}

export { saudiaConfig, flynasConfig, flyadealConfig, riyadhAirConfig };
