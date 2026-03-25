"use client";

import Link from "next/link";
import useSWR from "swr";
import { Plane, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeFormatToggle } from "@/components/trip/TimeFormatToggle";
import { MyFlightsTripCards } from "./MyFlightsTripCards";
import { tripToCardData } from "@/utils/tripCardData";
import { getSwapStatusByScheduleTripId } from "@/utils/tripSwapStatus";

const PRIMARY = "#1E6FB9";

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
};

type ProfileResponse = {
  data?: {
    airline?: { code?: string };
    base?: { airportCode?: string };
  };
};

type MyTripsResponse = {
  data?: Array<{
    id: string;
    tripNumber: string;
    instanceId?: string;
    reportTime?: string | null;
    creditHours: number;
    blockHours: number;
    tafb: number;
    tripType: string;
    routeType?: string;
    legs: Array<{
      legOrder: number;
      flightNumber: string;
      aircraftTypeCode: string;
      dayOfWeek?: string | null;
      departureDate: string;
      departureTime: string;
      departureAirport: string;
      arrivalDate?: string;
      arrivalAirport: string;
      arrivalTime: string;
      flyingTime: number;
    }>;
    layovers: Array<{ airport: string; durationDecimal: number; afterLegOrder: number }>;
  }>;
};

type MyTradesResponse = {
  data?: {
    items?: Array<{
      id: string;
      status: "OPEN" | "MATCHED" | "ACCEPTED" | "COMPLETED" | "CANCELLED" | "EXPIRED";
      tradeType: "FLIGHT_SWAP" | "VACATION_SWAP";
      scheduleTripId: string | null;
    }>;
  };
};

export function MyTradesPageClient() {
  const { data: profileJson } = useSWR<ProfileResponse>("/api/profile", fetcher);
  const { data: tripsJson, isLoading: tripsLoading } = useSWR<MyTripsResponse>("/api/schedule/my-trips", fetcher);
  const { data: tradesJson } = useSWR<MyTradesResponse>("/api/trades?mine=1", fetcher);

  const airlineCode = profileJson?.data?.airline?.code ?? "SV";
  const baseAirportCode = profileJson?.data?.base?.airportCode ?? null;

  const flightTrades = (tradesJson?.data?.items ?? []).filter((t) => t.tradeType === "FLIGHT_SWAP");
  const swapStatusByScheduleTripId = getSwapStatusByScheduleTripId(
    flightTrades.map((t) => ({
      id: t.id,
      status: t.status,
      scheduleTripId: t.scheduleTripId,
    }))
  );

  const scheduledCards = (tripsJson?.data ?? []).map((trip) => {
    const baseCard = tripToCardData({
      scheduleTripId: trip.id,
      instanceId: trip.instanceId,
      reportTime: trip.reportTime ?? undefined,
      tripNumber: trip.tripNumber,
      legs: trip.legs.map((leg) => ({
        legOrder: leg.legOrder,
        flightNumber: leg.flightNumber,
        aircraftTypeCode: leg.aircraftTypeCode,
        dayOfWeek: leg.dayOfWeek ?? "",
        departureDate: new Date(leg.departureDate),
        departureTime: leg.departureTime,
        departureAirport: leg.departureAirport,
        arrivalDate: leg.arrivalDate ? new Date(leg.arrivalDate) : undefined,
        arrivalAirport: leg.arrivalAirport,
        arrivalTime: leg.arrivalTime,
        flyingTime: leg.flyingTime,
      })),
      layovers: (trip.layovers ?? []).map((lo) => ({
        airport: lo.airport,
        durationDecimal: lo.durationDecimal,
        afterLegOrder: lo.afterLegOrder,
      })),
      creditHours: trip.creditHours,
      blockHours: trip.blockHours,
      tafb: trip.tafb,
      tripType: trip.tripType,
      routeType: trip.routeType === "DOMESTIC" ? "domestic" : "international",
    });
    const statusInfo = swapStatusByScheduleTripId[trip.id];
    return {
      ...baseCard,
      airlineCode,
      ...(statusInfo && {
        swapStatus: statusInfo.status,
        tradeId: statusInfo.tradeId,
      }),
    };
  });

  const totalFlights = scheduledCards.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Flights</h1>
          <p className="mt-1 text-sm text-slate-500">
            {totalFlights} flight{totalFlights !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="origin-top-right scale-110">
          <TimeFormatToggle />
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Scheduled flights</h2>
        {tripsLoading ? (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
            ))}
          </div>
        ) : scheduledCards.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center">
            <Plane className="mx-auto h-10 w-10 text-slate-300" strokeWidth={1.5} />
            <p className="mt-3 text-sm text-slate-600">No scheduled flights</p>
            <p className="mt-1 text-xs text-slate-500">Upload your Line schedule to see your roster</p>
            <Link href="/dashboard/schedule" className="mt-3 inline-block">
              <Button className="gap-2" style={{ backgroundColor: PRIMARY }}>
                <Plus className="h-4 w-4" /> Upload Line Schedule
              </Button>
            </Link>
          </div>
        ) : (
          <MyFlightsTripCards
            scheduledCards={scheduledCards}
            tradeCards={[]}
            baseAirportCode={baseAirportCode}
          />
        )}
      </section>
    </div>
  );
}
