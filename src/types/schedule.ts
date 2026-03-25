// Phase 2 - Schedule parsing types

export interface ParsedSchedule {
  lineNumber: string;
  month: number;
  year: number;
  totalCredit?: number;
  totalBlock?: number;
  daysOff?: number;
  dutyPeriods?: number;
  trips: ParsedTrip[];
}

export interface ParsedLayover {
  airport: string;
  durationRaw: string;
  durationDecimal: number;
  afterLegOrder: number;
}

export interface ParsedTrip {
  tripNumber: string;
  /** Unique per parsed schedule instance (e.g. 241, 241_2). */
  instanceId: string;
  reportTime: string;
  reportDate?: Date;
  legs: ParsedLeg[];
  layovers?: ParsedLayover[];
  creditHours: number;
  blockHours: number;
  tafb: number;
}

export interface ParsedLeg {
  legOrder: number;
  /** Day of week code from schedule (SA, FR, SU, etc.) - was incorrectly parsed as airlineCode */
  dayOfWeek: string;
  flightNumber: string;
  aircraftTypeCode: string;
  departureDate?: Date;
  departureTime: string;
  departureAirport: string;
  arrivalDate?: Date;
  arrivalTime: string;
  arrivalAirport: string;
  flyingTimeRaw?: string;
  flyingTime: number;
  layoverDuration?: number;
  layoverAirport?: string;
}

export interface RawTripBlock {
  raw: string;
  tripNumber?: string;
  reportTime?: string;
}

export interface TripSummary {
  creditHours: number;
  blockHours: number;
  tafb: number;
}

export interface LayoverInfo {
  airport: string;
  durationHours: number;
}
