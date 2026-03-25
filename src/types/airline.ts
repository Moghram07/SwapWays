import type { SwapRuleType } from "./enums";

export interface AirlineConfig {
  name: string;
  code: string;
  emailDomain: string;
  ranks: {
    cabin: RankConfig[];
    flightDeck: RankConfig[];
  };
  aircraftTypes: AircraftTypeConfig[];
  bases: BaseConfig[];
  swapRules: SwapRuleConfig[];
  scheduleFormat?: ScheduleFormatConfig;
}

export interface RankConfig {
  code: string;
  name: string;
  sortOrder: number;
}

export interface AircraftTypeConfig {
  code: string;
  name: string;
  scheduleCode: string;
}

export interface BaseConfig {
  name: string;
  airportCode: string;
}

export interface SwapRuleConfig {
  ruleType: SwapRuleType;
  description: string;
}

export interface ScheduleFormatConfig {
  tripPattern: RegExp;
  legPattern: RegExp;
  layoverPattern: RegExp;
  creditPattern: RegExp;
}
