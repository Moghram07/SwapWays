/**
 * Types for trip card UI (My Flights, swap flow).
 */

import type { TripType } from "@/utils/tripClassifier";

export type SwapStatus =
  | "none"
  | "posted"
  | "matched"
  | "accepted"
  | "completed";

export interface TripCardData {
  tripNumber: string;
  /** Unique schedule trip instance id (e.g. 241, 241_2). */
  instanceId?: string;
  tripType: TripType;
  swapStatus: SwapStatus;
  matchId?: string;
  /** Set when card represents a trade; used for cancel swap API */
  tradeId?: string;
  /** Underlying scheduleTrip record id, when this card is backed by a parsed schedule trip. */
  scheduleTripId?: string;
  /** Airline code for flight number prefix (e.g. SV). Defaults to SV. */
  airlineCode?: string;
  /** Report time from schedule (e.g. 04:00Z) when available. */
  reportTime?: string;
  startDate: Date;
  endDate: Date;
  destinations: string[];
  legs: TripCardLeg[];
  layovers: TripCardLayover[];
  creditHours: number;
  blockHours: number;
  tafb: number;
  routeType: "domestic" | "international";
}

export interface TripCardLeg {
  legNumber: number;
  flightNumber: string;
  aircraftCode: string;
  dayOfWeek: string;
  departureDate: Date;
  departureAirport: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalTime: string;
  /** When arrival is the next calendar day (e.g. overnight flight). */
  arrivalDate?: Date;
  flyingTimeDecimal: number;
  isDeadHead?: boolean;
  rawFlightNumber?: string;
}

export interface TripCardLayover {
  airport: string;
  durationDecimal: number;
  afterLegNumber: number;
}
