"use client";

import { Plane } from "lucide-react";
import { getAircraftName } from "@/utils/aircraftNames";
import {
  decimalHoursToDisplayTime,
  formatZuluTime,
} from "@/utils/timeUtils";
import { zuluToLocal, getLocalDateFromZulu } from "@/utils/airportTimezones";
import { formatLocalDate } from "@/utils/dateUtils";
import type { TripCardLeg } from "@/types/tripCard";
import { useTimeFormat } from "@/hooks/useTimeFormat";

const WEEKDAY_NAMES: Record<string, string> = {
  MO: "Mon",
  TU: "Tue",
  WE: "Wed",
  TH: "Thu",
  FR: "Fri",
  SA: "Sat",
  SU: "Sun",
};

const UTC_DATE_OPTS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
};
const UTC_WEEKDAY_OPTS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
};

interface TripLegItemProps {
  leg: TripCardLeg;
  legNumber: number;
  timeMode?: "zulu" | "local";
}

export function TripLegItem({ leg, timeMode = "zulu" }: TripLegItemProps) {
  const { format: globalFormat } = useTimeFormat();
  const format = timeMode ?? globalFormat;
  const depLocal = zuluToLocal(leg.departureTime, leg.departureAirport);
  const arrLocal = zuluToLocal(leg.arrivalTime, leg.arrivalAirport);
  const arrivalDate = leg.arrivalDate ?? leg.departureDate;
  const crossesMidnight =
    leg.departureDate.toDateString() !== arrivalDate.toDateString();

  const dateStr =
    format === "local"
      ? formatLocalDate(
          getLocalDateFromZulu(
            leg.departureDate,
            leg.departureTime,
            leg.departureAirport
          ),
          { weekday: false, year: false }
        )
      : leg.departureDate.toLocaleDateString("en-US", UTC_DATE_OPTS);
  const weekday =
    format === "local"
      ? formatLocalDate(
          getLocalDateFromZulu(
            leg.departureDate,
            leg.departureTime,
            leg.departureAirport
          ),
          { weekday: true, year: false }
        ).split(", ")[0] ?? ""
      : WEEKDAY_NAMES[leg.dayOfWeek] ?? leg.departureDate.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const arrivalDateStr =
    format === "local"
      ? formatLocalDate(
          getLocalDateFromZulu(
            arrivalDate,
            leg.arrivalTime,
            leg.arrivalAirport
          ),
          { weekday: true, year: false }
        )
      : arrivalDate.toLocaleDateString("en-US", UTC_WEEKDAY_OPTS);

  const departurePrimary =
    format === "zulu"
      ? formatZuluTime(leg.departureTime)
      : depLocal.label;
  const arrivalPrimary =
    format === "zulu"
      ? formatZuluTime(leg.arrivalTime)
      : arrLocal.label;

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
        <Plane
          size={16}
          className={`rotate-45 ${leg.isDeadHead ? "text-purple-500" : "text-slate-500"}`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-sm text-gray-500">
          <span className="font-medium text-gray-700">
            SV{leg.flightNumber}
            {leg.isDeadHead && (
              <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-semibold">
                DH (No Duty)
              </span>
            )}
          </span>
          <span>·</span>
          <span>{getAircraftName(leg.aircraftCode)}</span>
        </div>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">
            {weekday}, {dateStr}
          </span>
          <span className="text-base font-semibold text-gray-900">
            {leg.departureAirport}
          </span>
          <div className="flex flex-1 items-center px-2">
            <div className="h-px flex-1 bg-gray-300" />
            <Plane size={14} className="mx-1 text-gray-400" />
            <div className="h-px flex-1 bg-gray-300" />
          </div>
          <span className="text-base font-semibold text-gray-900">
            {leg.arrivalAirport}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className={`font-medium ${format === "local" ? "text-green-600" : "text-blue-600"}`}>
              Dep: {departurePrimary}
            </p>
          </div>
          <div className="text-center text-gray-500">
            {decimalHoursToDisplayTime(leg.flyingTimeDecimal)}
          </div>
          <div className="text-right">
            <p className={`font-medium ${format === "local" ? "text-green-600" : "text-blue-600"}`}>
              Arr: {arrivalPrimary}
              {arrLocal.nextDay && (
                <span className="ml-1 text-amber-600">(next day)</span>
              )}
              {crossesMidnight && format === "zulu" && (
                <span className="ml-1 text-xs text-amber-600">({arrivalDateStr})</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
