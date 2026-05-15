import type { WantType } from "@/types/enums";

/** Schedule trip shape used by soft scoring / signal scoring. */
export type SignalScheduleTrip = {
  instanceId: string;
  startDate: Date;
  blockHours: number;
  tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP" | "PAIRING_WITH_LAYOVER";
  legs: { departureAirport: string; arrivalAirport: string; departureDate: Date; arrivalDate: Date }[];
  layovers?: { durationDecimal: number }[];
};

export interface ViewerSignals {
  offeredDates: Date[];
  offeredDateKeys: Set<string>;
  offeredDestinations: string[];
  wantedDestinations: string[];
  excludedDestinations: string[];
  wtfDateKeys: Set<string>;
  wantTypes: WantType[];
  hasAnyDestinationFlex: boolean;
  viewerPostsBlockHoursTotal: number;
  scheduleTripsByMonth: Map<string, SignalScheduleTrip[]>;
  hasActivePosts: boolean;
  hasSchedule: boolean;
  wantEqualHours: boolean;
  wantSameDate: boolean;
  wantMinLayover: number | null;
  hasExplicitWtfFromPosts: boolean;
}

export function viewerHasComparableSignals(signals: ViewerSignals): boolean {
  return signals.hasActivePosts || signals.hasSchedule;
}
