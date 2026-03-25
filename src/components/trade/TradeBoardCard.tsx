"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { formatCreditHours } from "@/utils/formatters";
import { getAirportCity } from "@/utils/airportNames";
import { getAircraftName } from "@/utils/aircraftNames";
import { getTripTypeInfo } from "@/utils/tripClassifier";
import type { TripType } from "@/utils/tripClassifier";

export type BoardTrade = {
  id: string;
  tradeType: string;
  destination: string | null;
  departureDate: Date | null;
  flightNumber: string | null;
  aircraftTypeCode: string | null;
  creditHours: number | null;
  tafb: number | null;
  user: {
    rank: { name: string; code: string };
    base: { name: string; airportCode: string };
  };
  scheduleTrip: {
    tripType: string;
    startDate: Date;
    endDate: Date;
    legs: { flightNumber: string; departureDate: Date; departureAirport: string; arrivalAirport: string }[];
    layovers: { airport: string; durationDecimal: number }[];
  } | null;
  matchCount?: number;
};

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

interface TradeBoardCardProps {
  trade: BoardTrade;
  onMessage: (trade: BoardTrade) => void | Promise<void>;
}

export function TradeBoardCard({ trade, onMessage }: TradeBoardCardProps) {
  const tripType = (trade.scheduleTrip?.tripType ?? "TURNAROUND") as TripType;
  const typeInfo = getTripTypeInfo(tripType);
  const firstLeg = trade.scheduleTrip?.legs?.[0];
  const lastLeg = trade.scheduleTrip?.legs?.length
    ? trade.scheduleTrip.legs[trade.scheduleTrip.legs.length - 1]
    : null;
  const startDate = trade.scheduleTrip?.startDate ?? trade.departureDate ?? new Date();
  const endDate = trade.scheduleTrip?.endDate ?? trade.departureDate ?? new Date();
  const destination = trade.destination ?? lastLeg?.arrivalAirport ?? "—";
  const layoverSummary =
    trade.scheduleTrip?.layovers?.length &&
    trade.scheduleTrip.layovers.length > 0
      ? trade.scheduleTrip.layovers
          .map((l) => `${getAirportCity(l.airport)} (${l.durationDecimal.toFixed(0)}h)`)
          .join(", ")
      : null;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeInfo.bgColor} ${typeInfo.textColor}`}>
            {typeInfo.label}
          </span>
          {firstLeg && (
            <span className="font-medium text-slate-700">
              SV{firstLeg.flightNumber ?? trade.flightNumber ?? "—"}
            </span>
          )}
          <span className="text-slate-600">
            {getAirportCity(destination)} ({destination})
          </span>
          <span className="text-slate-500 text-sm">
            {formatDateRange(new Date(startDate), new Date(endDate))}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
          {trade.aircraftTypeCode && (
            <span>{getAircraftName(trade.aircraftTypeCode)}</span>
          )}
          <span>Block {formatCreditHours(trade.creditHours)}</span>
          <span>TAFB {formatCreditHours(trade.tafb)}</span>
          {layoverSummary && (
            <span className="text-slate-500">Layover: {layoverSummary}</span>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {trade.user.rank.code ?? trade.user.rank.name} · {trade.user.base.name}
        </p>
        {trade.matchCount != null && trade.matchCount > 0 && (
          <p className="mt-1 text-xs text-sky-600">
            {trade.matchCount} match{trade.matchCount !== 1 ? "es" : ""}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 border-[#1E6FB9] text-[#1E6FB9] hover:bg-[#E3EFF9]"
          onClick={() => onMessage(trade)}
        >
          <MessageCircle size={16} />
          Message
        </Button>
        <Link href={`/dashboard/matches?trade=${trade.id}`}>
          <Button size="sm">Request swap</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
