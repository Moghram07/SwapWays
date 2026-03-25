import type { TripType, TripTypeInfo } from "@/utils/tripClassifier";

export type TripDayRole =
  | "DEPART_ONLY"
  | "RETURN_ONLY"
  | "SAME_DAY"
  | "DEPART_OVERNIGHT"
  | "RETURN_EARLY"
  | "LAYOVER_DAY"
  | "MULTI_STOP"
  | "DEPART_WITH_LAYOVER"
  | "ARRIVAL_ONLY";

export interface CalendarLegInfo {
  flightNumber: string;
  aircraftCode: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTimeZ: string;
  arrivalTimeZ: string;
  departureLocal: string;
  arrivalLocal: string;
  /** True when local time is on the next calendar day vs Zulu date (e.g. 22:45Z = 1:45 AM +1d at ADD). */
  departureLocalNextDay?: boolean;
  duration: string;
  crossesMidnight: boolean;
}

export interface CalendarTripEvent {
  tripNumber: string;
  tripInstanceId?: string;
  tripType: TripType;
  typeInfo: TripTypeInfo;
  dayRole: TripDayRole;
  destinationCity: string;
  destinationCode: string;
  tripLabel: string;
  legs: CalendarLegInfo[];
  continuesFromYesterday: boolean;
  continuesTomorrow: boolean;
  /** When dayRole is LAYOVER_DAY, the city name for the layover airport (e.g. Denpasar). */
  layoverCity?: string;
}

export interface CalendarDayData {
  dayOfMonth: number;
  month: number;
  year: number;
  date: Date;
  weekday: string;
  isOverflow: boolean;
  events: CalendarTripEvent[];
}
