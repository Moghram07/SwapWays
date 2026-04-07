import type { SwapPostType, SwapPostStatus, WantType } from "./enums";
import type { TripType } from "./enums";

export type { SwapPostType, SwapPostStatus, WantType };

export interface WantCriteriaData {
  wantType: WantType;
  wantTripTypes: TripType[];
  wantMinLayover: number | null;
  wantMinCredit: number | null;
  wantMaxCredit: number | null;
  wantEqualHours: boolean;
  wantSameDate: boolean;
  wantDestinations: string[];
  wantExclude: string[];
  wtfDays: number[];
  wantDaysOff: boolean;
  notes: string;
}

export type SwapPostInputSource = "MANUAL_QUICK" | "SCHEDULE_PREFILL";

export interface QuickPostTripData {
  tripType: TripType;
  destinations: string[];
  date: string; // ISO date string
  layoverHours?: number | null;
}

export interface QuickPostAdvancedData {
  reportTime?: string | null;
  aircraftTypeCode?: string | null;
  blockHours?: number | null;
  flightNumber?: string | null;
}

export interface SwapPostTripData {
  id: string;
  swapPostId: string;
  scheduleTripId: string;
  flightNumber: string;
  destination: string;
  departureDate: Date;
  tripType: TripType;
  creditHours: number;
  tafb: number;
  hasLayover: boolean;
  layoverCity: string | null;
  layoverHours: number | null;
}

export interface SwapPostData {
  id: string;
  userId: string;
  postType: SwapPostType;
  status: SwapPostStatus;
  offeringDaysOff: boolean;
  offeredDaysOff: number[];
  wantType: WantType;
  wantTripTypes: TripType[];
  wantMinLayover: number | null;
  wantMinCredit: number | null;
  wantMaxCredit: number | null;
  wantEqualHours: boolean;
  wantSameDate: boolean;
  wantDestinations: string[];
  wantExclude: string[];
  wtfDays: number[];
  wantDaysOff: boolean;
  notes: string | null;
  vacationStartDate: Date | null;
  vacationEndDate: Date | null;
  desiredVacationStart: Date | null;
  desiredVacationEnd: Date | null;
  vacationYear: number | null;
  vacationMonth: number | null;
  vacationStartDay: number | null;
  vacationEndDay: number | null;
  desiredVacationMonths: number[];
  source?: SwapPostInputSource;
  quickTripType?: TripType | null;
  quickDestinations?: string[];
  quickDate?: Date | null;
  quickLayoverHours?: number | null;
  advancedReportTime?: string | null;
  advancedAircraftTypeCode?: string | null;
  advancedBlockHours?: number | null;
  advancedFlightNumber?: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
  offeredTrips: SwapPostTripData[];
  user: {
    id: string;
    firstName: string;
    lastName?: string;
    rank: { name: string; code: string };
    base: { name: string; airportCode: string };
  };
}

export interface CreateSwapPostInput {
  postType: SwapPostType;
  selectedTrips: string[];
  selectedDaysOff: number[];
  wantCriteria: WantCriteriaData;
  source?: SwapPostInputSource;
  quickTrip?: QuickPostTripData;
  advanced?: QuickPostAdvancedData;
}

/** Trip row for Create Post wizard (from schedule). */
export interface ScheduleTripForWizard {
  id: string;
  tripNumber: string;
  startDate: Date;
  creditHours: number;
  tafb: number;
  tripType: TripType;
  legs: { flightNumber: string; departureAirport: string; arrivalAirport: string }[];
  layovers: { airport: string; durationDecimal: number }[];
}
