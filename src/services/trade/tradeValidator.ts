import type { CreateTradeInput } from "@/types/trade";

export interface ValidationError {
  field: string;
  message: string;
}

export function validateCreateTradeInput(data: CreateTradeInput): ValidationError[] {
  const errors: ValidationError[] = [];

  const isFlightSwap = data.tradeType === "FLIGHT_SWAP";
  const usesScheduleTrip = isFlightSwap && !!data.scheduleTripId;

  if (isFlightSwap && usesScheduleTrip) {
    if (!Array.isArray(data.desiredDestinations) || data.desiredDestinations.length === 0) {
      errors.push({ field: "desiredDestinations", message: "At least one desired destination is required" });
    }
    if (!Array.isArray(data.wtfDays)) {
      errors.push({ field: "wtfDays", message: "WTF days must be an array" });
    }
  } else {
    if (!data.destination?.trim()) errors.push({ field: "destination", message: "Destination is required" });
    if (!data.departureDate) errors.push({ field: "departureDate", message: "Departure date is required" });
    if (!data.reportTime?.trim()) errors.push({ field: "reportTime", message: "Report time is required" });
    if (!Array.isArray(data.desiredDestinations) || data.desiredDestinations.length === 0) {
      errors.push({ field: "desiredDestinations", message: "At least one desired destination is required" });
    }
    if (!Array.isArray(data.wtfDays)) {
      errors.push({ field: "wtfDays", message: "WTF days must be an array" });
    }
  }

  if (data.tradeType === "VACATION_SWAP") {
    if (!data.vacationStartDate) errors.push({ field: "vacationStartDate", message: "Vacation start is required" });
    if (!data.vacationEndDate) errors.push({ field: "vacationEndDate", message: "Vacation end is required" });
  }

  return errors;
}
