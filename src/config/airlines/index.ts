import type { AirlineConfig } from "@/types/airline";
import { saudiaConfig } from "./saudia";

const airlineRegistry: Record<string, AirlineConfig> = {
  SV: saudiaConfig,
  saudia: saudiaConfig,
};

export function getAirlineConfig(codeOrName: string): AirlineConfig | undefined {
  return airlineRegistry[codeOrName.toUpperCase()] ?? airlineRegistry[codeOrName.toLowerCase()];
}

export function getAllAirlineConfigs(): AirlineConfig[] {
  return [saudiaConfig];
}

export { saudiaConfig };
