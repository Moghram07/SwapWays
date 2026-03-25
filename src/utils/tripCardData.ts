/**
 * Server-safe helpers to build TripCardData from schedule trips or trades.
 * Used by the My Flights server page and re-exported by TripCard for client usage.
 */

import { getUniqueDestinations } from "@/utils/tripClassifier";
import type { TripCardData } from "@/types/tripCard";

export function tripToCardData(trip: {
  tripNumber: string;
  instanceId?: string;
  scheduleTripId?: string;
  reportTime?: string;
  legs: {
    legOrder: number;
    flightNumber: string;
    aircraftTypeCode: string;
    dayOfWeek: string;
    departureDate: Date;
    departureAirport: string;
    departureTime: string;
    arrivalDate?: Date;
    arrivalAirport: string;
    arrivalTime: string;
    flyingTime: number;
  }[];
  layovers?: { airport: string; durationDecimal: number; afterLegOrder: number }[];
  creditHours: number;
  blockHours: number;
  tafb: number;
  tripType?: string;
  routeType?: string;
}): TripCardData {
  const legs = trip.legs;
  const destinations = getUniqueDestinations({ legs });
  const firstLeg = legs[0];
  const lastLeg = legs[legs.length - 1];
  return {
    tripNumber: trip.tripNumber,
    instanceId: trip.instanceId,
    tripType: (trip.tripType as TripCardData["tripType"]) ?? "TURNAROUND",
    swapStatus: "none",
    scheduleTripId: trip.scheduleTripId,
    reportTime: trip.reportTime,
    startDate: firstLeg?.departureDate ?? new Date(),
    endDate: lastLeg?.arrivalDate ?? lastLeg?.departureDate ?? new Date(),
    destinations,
    legs: legs.map((leg) => ({
      ...(leg.flightNumber.toUpperCase().startsWith("DH") && {
        isDeadHead: true,
        rawFlightNumber: leg.flightNumber,
      }),
      legNumber: leg.legOrder,
      flightNumber: leg.flightNumber.toUpperCase().startsWith("DH")
        ? leg.flightNumber.slice(2)
        : leg.flightNumber,
      aircraftCode: leg.aircraftTypeCode,
      dayOfWeek: leg.dayOfWeek,
      departureDate: leg.departureDate,
      departureAirport: leg.departureAirport,
      departureTime: leg.departureTime,
      arrivalDate: leg.arrivalDate,
      arrivalAirport: leg.arrivalAirport,
      arrivalTime: leg.arrivalTime,
      flyingTimeDecimal: leg.flyingTime,
    })),
    layovers: (trip.layovers ?? []).map((lo) => ({
      airport: lo.airport,
      durationDecimal: lo.durationDecimal,
      afterLegNumber: lo.afterLegOrder,
    })),
    creditHours: trip.creditHours,
    blockHours: trip.blockHours,
    tafb: trip.tafb,
    routeType: (trip.routeType as "domestic" | "international") ?? "international",
  };
}

function tradeStatusToSwapStatus(
  status: string
): "none" | "posted" | "matched" | "accepted" | "completed" {
  switch (status) {
    case "OPEN":
      return "posted";
    case "MATCHED":
      return "matched";
    case "ACCEPTED":
      return "accepted";
    case "COMPLETED":
      return "completed";
    default:
      return "none";
  }
}

export function tradeToCardData(trade: {
  id: string;
  status: string;
  scheduleTripId?: string | null;
  tripNumber: string | null;
  flightNumber: string | null;
  aircraftTypeCode: string | null;
  destination: string | null;
  departureDate: Date | null;
  reportTime: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  flyingTime: number | null;
  creditHours: number | null;
  blockHours?: number | null;
  tafb: number | null;
  scheduleTrip?: {
    id?: string;
      instanceId?: string;
    reportTime?: string | null;
    tripNumber: string;
    startDate: Date;
    endDate: Date;
    tripType: string;
    routeType: string;
    creditHours: number;
    blockHours: number;
    tafb: number;
    legs: {
      legOrder: number;
      flightNumber: string;
      aircraftTypeCode: string;
      dayOfWeek: string | null;
      departureDate: Date;
      departureTime: string;
      departureAirport: string;
      arrivalDate?: Date;
      arrivalAirport: string;
      arrivalTime: string;
      flyingTime: number;
    }[];
    layovers: { airport: string; durationDecimal: number; afterLegOrder: number }[];
  } | null;
}): TripCardData {
  if (trade.scheduleTrip) {
    const st = trade.scheduleTrip;
    const tripData = tripToCardData({
      scheduleTripId: st.id,
      instanceId: st.instanceId,
      reportTime: st.reportTime ?? undefined,
      tripNumber: st.tripNumber,
      legs: st.legs.map((leg) => ({
        legOrder: leg.legOrder,
        flightNumber: leg.flightNumber,
        aircraftTypeCode: leg.aircraftTypeCode,
        dayOfWeek: leg.dayOfWeek ?? "",
        departureDate: leg.departureDate,
        departureTime: leg.departureTime,
        departureAirport: leg.departureAirport,
        arrivalDate: leg.arrivalDate,
        arrivalAirport: leg.arrivalAirport,
        arrivalTime: leg.arrivalTime,
        flyingTime: leg.flyingTime,
      })),
      layovers: st.layovers.map((lo) => ({
        airport: lo.airport,
        durationDecimal: lo.durationDecimal,
        afterLegOrder: lo.afterLegOrder,
      })),
      creditHours: st.creditHours,
      blockHours: st.blockHours,
      tafb: st.tafb,
      tripType: st.tripType,
      routeType: st.routeType === "DOMESTIC" ? "domestic" : "international",
    });
    return {
      ...tripData,
      swapStatus: tradeStatusToSwapStatus(trade.status),
      tradeId: trade.id,
      scheduleTripId: st.id ?? trade.scheduleTripId ?? undefined,
    };
  }
  const depDate = trade.departureDate ?? new Date();
  const dest = trade.destination ?? "—";
  const base = trade.reportTime ?? "";
  return {
    tripNumber: trade.tripNumber ?? "—",
    tripType: "TURNAROUND",
    swapStatus: tradeStatusToSwapStatus(trade.status),
    tradeId: trade.id,
    scheduleTripId: trade.scheduleTripId ?? undefined,
    startDate: depDate,
    endDate: depDate,
    destinations: dest ? [dest] : [],
    legs: [
      {
        legNumber: 1,
        flightNumber: trade.flightNumber ?? "—",
        aircraftCode: trade.aircraftTypeCode ?? "—",
        dayOfWeek: "",
        departureDate: depDate,
        departureAirport: base,
        departureTime: trade.departureTime ?? trade.reportTime ?? "—",
        arrivalAirport: dest,
        arrivalTime: trade.arrivalTime ?? "—",
        flyingTimeDecimal: trade.flyingTime ?? 0,
      },
    ],
    layovers: [],
    creditHours: trade.creditHours ?? 0,
    blockHours: trade.blockHours ?? 0,
    tafb: trade.tafb ?? 0,
    routeType: "international",
  };
}
