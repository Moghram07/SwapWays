"use client";

import { TripTypeBadge } from "@/components/trip/TripTypeBadge";
import { RouteChain } from "@/components/RouteChain";
import { getTripTypeInfo } from "@/utils/tripClassifier";
import { decimalHoursToDisplayTime } from "@/utils/timeUtils";
import { zuluToLocal } from "@/utils/airportTimezones";
import { buildTripRouteChainNodes } from "@/utils/multiStopRouteDisplay";

/** "HH:MM" → "HH.MMZ" for zuluToLocal conversion. */
function inputToZulu(s: string): string {
  const t = s.trim().replace(":", ".");
  if (!t) return "";
  return t.endsWith("Z") ? t : t + "Z";
}

const UTC_DATE_OPTS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
};

export interface TripBoardPreviewLeg {
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string; // "HH:MM" input value
  isDeadhead: boolean;
}

export interface TripBoardPreviewLayover {
  airport: string;
  durationDecimal: number;
}

interface TripBoardPreviewProps {
  tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
  legs: TripBoardPreviewLeg[];
  layovers?: TripBoardPreviewLayover[];
  reportTime: string;      // "HH:MM" input value
  blockHours: number | null;
  startDate: Date;
}

export function TripBoardPreview({
  tripType,
  legs,
  layovers,
  reportTime,
  blockHours,
  startDate,
}: TripBoardPreviewProps) {
  const typeInfo = getTripTypeInfo(tripType);

  const routeNodes = buildTripRouteChainNodes({
    destination: legs[legs.length - 1]?.arrivalAirport ?? "",
    legs,
    layoverCity: layovers?.[0]?.airport ?? null,
    layoverHours: layovers?.[0]?.durationDecimal ?? null,
  });

  const legDeadheads = legs.map((l) => l.isDeadhead);

  const firstDepAirport = legs[0]?.departureAirport ?? "";
  const reportZulu = inputToZulu(reportTime);
  const reportLocal = reportZulu && firstDepAirport
    ? zuluToLocal(reportZulu, firstDepAirport).label
    : null;

  const dateLabel = startDate.toLocaleDateString("en-US", UTC_DATE_OPTS);

  return (
    <div className={`rounded-lg border p-3 ${typeInfo.bgColor}`}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        Board preview
      </p>
      <div className="flex flex-wrap items-start gap-2">
        <TripTypeBadge typeInfo={typeInfo} />
        <span className="text-sm text-gray-500">{dateLabel}</span>
        {reportLocal && (
          <span className="text-sm text-gray-600">
            Report: <span className="font-medium text-green-600">{reportLocal}</span>
          </span>
        )}
        {blockHours != null && blockHours > 0 && (
          <span className="text-sm text-gray-500">
            Block: <span className="font-medium">{decimalHoursToDisplayTime(blockHours)}</span>
          </span>
        )}
      </div>
      <div className="mt-2">
        <RouteChain
          nodes={routeNodes}
          tripType={tripType}
          legDeadheads={legDeadheads}
        />
      </div>
    </div>
  );
}
