import type { TradeStatus, TradeType } from "./enums";

export interface CreateTradeInput {
  tradeType: TradeType;
  scheduleTripId?: string;
  tripNumber?: string;
  flightNumber?: string;
  aircraftTypeCode?: string;
  destination: string;
  departureDate: Date;
  reportTime: string;
  departureTime?: string;
  arrivalTime?: string;
  flyingTime?: number;
  layoverDuration?: number;
  creditHours?: number;
  blockHours?: number;
  tafb?: number;
  desiredDestinations: string[];
  wtfDays: number[];
  preferMinCredit?: number;
  preferMaxCredit?: number;
  notes?: string;
  vacationStartDate?: Date;
  vacationEndDate?: Date;
  desiredVacationStart?: Date;
  desiredVacationEnd?: Date;
}

export interface TradeWithUser {
  id: string;
  tradeType: TradeType;
  status: TradeStatus;
  tripNumber?: string | null;
  flightNumber?: string | null;
  aircraftTypeCode?: string | null;
  destination: string;
  departureDate: Date;
  departureTime?: string | null;
  reportTime: string;
  flyingTime?: number | null;
  layoverDuration?: number | null;
  creditHours?: number | null;
  tafb?: number | null;
  desiredDestinations: string[];
  wtfDays: number[];
  notes?: string | null;
  user: {
    firstName: string;
    lastName: string;
    rank: { code: string; name: string };
    base: { airportCode: string; name: string };
  };
  matchCount: number;
  createdAt: Date;
}

export interface TradeFilters {
  destination?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tradeType?: TradeType;
  aircraftType?: string;
  page?: number;
  limit?: number;
}
