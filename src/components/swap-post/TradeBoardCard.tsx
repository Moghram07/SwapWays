"use client";

import { Fragment, useState } from "react";
import { MessageCircle, Moon } from "lucide-react";
import { getTripTypeInfo } from "@/utils/tripClassifier";
import { creditHoursToHumanReadable, formatZuluTime } from "@/utils/timeUtils";
import { formatDisplayDate, formatLocalDate } from "@/utils/dateUtils";
import { zuluToLocal, getLocalDateFromZulu } from "@/utils/airportTimezones";
import { getAirportCity, getAirportDisplay, normalizeAirportCode } from "@/utils/airportNames";
import {
  collapseConsecutiveAirports,
  formatMultiStopAirportChain,
  multiStopRouteSegmentsFromCodes,
  multiStopRouteSegmentsFromLegs,
} from "@/utils/multiStopRouteDisplay";
import { useTimeFormat } from "@/hooks/useTimeFormat";
import { TripTypeBadge } from "@/components/trip/TripTypeBadge";
import { MatchBadge } from "@/components/swap-post/MatchBadge";
import { NotesDisplay } from "@/components/swap-post/NotesDisplay";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import type { WantAcceptanceOption } from "@/types/swapPost";

type WantType =
  | "LAYOVER"
  | "LONGER_LAYOVER"
  | "ROUND_TRIP"
  | "ANY_FLIGHT"
  | "DAYS_OFF"
  | "ANYTHING"
  | "SPECIFIC";

interface TripRow {
  flightNumber: string;
  destination: string;
  destinations?: string[];
  departureDate: Date;
  tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
  creditHours: number | null;
  blockHours?: number | null;
  tafb?: number;
  hasLayover?: boolean;
  layoverHours?: number | null;
  reportTime?: string;
  departureTime?: string;
  departureDateLeg?: Date;
  arrivalTime?: string;
  arrivalDateLeg?: Date;
  baseAirportCode?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  firstLegArrivalTime?: string;
  firstLegArrivalDate?: Date;
  firstLegArrivalAirport?: string;
  secondLegDepartureTime?: string;
  secondLegDepartureDate?: Date;
  secondLegDepartureAirport?: string;
  /** For MULTI_STOP: "City1 -> City2 -> City3" */
  stopsDisplay?: string;
  /**
   * Full leg chain (needed for multi-stop cards).
   * Times are in schedule Zulu format (e.g. "02.45Z").
   */
  legs?: Array<{
    legOrder: number;
    flightNumber?: string;
    departureTime?: string;
    departureDate?: Date;
    departureAirport?: string;
    arrivalTime?: string;
    arrivalDate?: Date;
    arrivalAirport?: string;
    flyingTime?: number;
  }>;
}

interface PostCardData {
  postType: string;
  source?: "MANUAL_QUICK" | "SCHEDULE_PREFILL" | null;
  quickTripType?: "LAYOVER" | "TURNAROUND" | "MULTI_STOP" | null;
  quickDestinations?: string[];
  quickDate?: Date | null;
  quickLayoverHours?: number | null;
  advancedReportTime?: string | null;
  advancedAircraftTypeCode?: string | null;
  advancedBlockHours?: number | null;
  advancedFlightNumber?: string | null;
  offeredTrips: TripRow[];
  offeringDaysOff?: boolean;
  offeredDaysOff?: number[];
  wantType: WantType;
  wantMinLayover?: number | null;
  wantEqualHours?: boolean;
  wantSameDate?: boolean;
  wantDestinations?: string[];
  wantExclude?: string[];
  wantAcceptanceOptions?: WantAcceptanceOption[];
  wtfDays?: number[];
  wantDaysOff?: boolean;
  notes?: string | null;
  user: {
    firstName: string;
    rank: { name: string; code?: string };
    base: { name: string; airportCode?: string };
  };
  createdAt?: Date;
  vacationStartDate?: Date;
  vacationEndDate?: Date;
  desiredVacationStart?: Date;
  desiredVacationEnd?: Date;
  vacationYear?: number | null;
  vacationMonth?: number | null;
  vacationStartDay?: number | null;
  vacationEndDay?: number | null;
  desiredVacationMonths?: number[];
  matchPercent?: number;
  matchTier?: "low" | "medium" | "high" | "none";
  matchReasons?: string[];
  bestTripIndex?: number | null;
  userTier?: "FREE" | "PREMIUM";
  notesIsTruncated?: boolean;
}

function getWantTypeLabel(type: WantType): string {
  const labels: Record<WantType, string> = {
    LAYOVER: "Any layover",
    LONGER_LAYOVER: "Any layover",
    ROUND_TRIP: "Round Trip",
    ANY_FLIGHT: "Any flight",
    DAYS_OFF: "Days off",
    ANYTHING: "Anything — open to offers",
    SPECIFIC: "Specific flights",
  };
  return labels[type] ?? "Open to offers";
}

function formatPreferenceDays(days: number[] | undefined): string {
  if (!days || days.length === 0) return "";
  return [...days].sort((a, b) => a - b).join(", ");
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const CARD_SECTION_LABEL = "mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500";

function OfferingTripRow({ trip }: { trip: TripRow }) {
  const typeInfo = getTripTypeInfo(trip.tripType);
  const { format: timeMode } = useTimeFormat();

  const legs = trip.legs ?? [];
  const firstLeg = legs[0];
  const lastLeg = legs.length > 0 ? legs[legs.length - 1] : undefined;
  const baseAirportCode = trip.baseAirportCode ?? firstLeg?.departureAirport ?? "";
  type Leg = NonNullable<TripRow["legs"]>[number];

  const rawDestinationCodes =
    trip.destinations && trip.destinations.length > 0
      ? trip.destinations
      : legs
          .map((l) => l.arrivalAirport)
          .filter((code): code is string => Boolean(code && code !== baseAirportCode));

  const displayDestinationCodes = collapseConsecutiveAirports(
    rawDestinationCodes.map((c) => normalizeAirportCode(String(c)))
  );

  const airportFmt = (code: string) => getAirportDisplay(code);

  const multiStopLineSegments =
    trip.tripType === "MULTI_STOP"
      ? multiStopRouteSegmentsFromLegs(legs, airportFmt) ??
        (displayDestinationCodes.length >= 2
          ? multiStopRouteSegmentsFromCodes(displayDestinationCodes, airportFmt)
          : [])
      : [];

  const destinationDisplay =
    trip.tripType === "MULTI_STOP"
      ? multiStopLineSegments.length > 0
        ? multiStopLineSegments.join(" + ")
        : displayDestinationCodes.length
          ? formatMultiStopAirportChain(displayDestinationCodes, airportFmt)
          : getAirportDisplay(trip.destination)
      : displayDestinationCodes.length
        ? getAirportDisplay(displayDestinationCodes[0])
        : getAirportDisplay(trip.destination);

  const dateRange = (() => {
    const departureDate = asDate(trip.departureDate);
    if (!departureDate) return "";
    if (!firstLeg || !lastLeg) {
      return departureDate.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    }

    const lastDate = asDate(lastLeg.arrivalDate) ?? asDate(lastLeg.departureDate) ?? departureDate;

    if (timeMode === "local" && firstLeg.departureTime && firstLeg.departureAirport && lastLeg.arrivalTime && lastLeg.arrivalAirport) {
      const startLocal = getLocalDateFromZulu(departureDate, firstLeg.departureTime, firstLeg.departureAirport);
      const endLocal = getLocalDateFromZulu(lastDate, lastLeg.arrivalTime, lastLeg.arrivalAirport);
      const startStr = formatLocalDate(startLocal, { weekday: false, year: false });
      const endStr = formatLocalDate(endLocal, { weekday: false, year: false });
      if (startLocal.year === endLocal.year && startLocal.month === endLocal.month && startLocal.day === endLocal.day) return startStr;
      return `${startStr} – ${endStr}`;
    }

    const startStr = departureDate.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    const endStr = lastDate.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    if (startStr === endStr) return startStr;
    return `${startStr} – ${endStr}`;
  })();

  const blockValue = trip.blockHours ?? trip.creditHours ?? 0;
  const blockLabel = blockValue > 0 ? creditHoursToHumanReadable(blockValue) : null;

  const reportTime = (() => {
    if (!trip.reportTime) return null;
    const reportAirport = trip.baseAirportCode ?? firstLeg?.departureAirport ?? "";
    if (!reportAirport) return null;
    return timeMode === "zulu"
      ? formatZuluTime(trip.reportTime)
      : zuluToLocal(trip.reportTime, reportAirport).label;
  })();

  const formatZuluOrLocalTime = (zuluTime?: string, airport?: string) => {
    if (!zuluTime || !airport) return "—";
    return timeMode === "zulu" ? formatZuluTime(zuluTime) : zuluToLocal(zuluTime, airport).label;
  };

  const formatArrivalNextDaySuffix = (leg: Leg) => {
    if (timeMode === "local") {
      if (!leg.arrivalTime || !leg.arrivalAirport) return "";
      const res = zuluToLocal(leg.arrivalTime, leg.arrivalAirport);
      return res.nextDay ? " +1d" : "";
    }

    const depIso = leg.departureDate?.toISOString().slice(0, 10);
    const arrIso = (leg.arrivalDate ?? leg.departureDate)?.toISOString().slice(0, 10);
    if (!depIso || !arrIso) return "";
    return depIso !== arrIso ? " +1d" : "";
  };

  const layoverCity = trip.tripType === "LAYOVER" ? (legs[0]?.arrivalAirport ?? legs[1]?.departureAirport) : undefined;
  const layoverDurationLabel =
    trip.tripType === "LAYOVER" && trip.layoverHours != null ? creditHoursToHumanReadable(trip.layoverHours) : null;

  return (
    <div className={`w-full rounded-md bg-slate-50/80 p-2.5 sm:p-3 border-s-4 ${typeInfo.borderColor}`}>
      <div className="mb-2 sm:mb-3">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-1.5">
          <TripTypeBadge typeInfo={typeInfo} />
          <span className="text-sm font-medium text-gray-500">{dateRange}</span>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
          <span className="min-w-0 text-sm font-bold leading-snug text-gray-900 sm:text-base">
            {trip.tripType === "MULTI_STOP" && multiStopLineSegments.length > 0 ? (
              <span className="block">
                <span className="block">
                  SV{firstLeg?.flightNumber ?? trip.flightNumber} · {multiStopLineSegments[0]}
                </span>
                {multiStopLineSegments.slice(1).map((seg, idx) => (
                  <span key={idx} className="mt-0.5 block pl-0 font-semibold sm:mt-1">
                    + {seg}
                  </span>
                ))}
              </span>
            ) : (
              <>
                SV{firstLeg?.flightNumber ?? trip.flightNumber} · {destinationDisplay}
              </>
            )}
          </span>
          {reportTime ? (
            <span className="shrink-0 text-sm text-gray-500">
              Report: <span className="font-medium text-gray-700">{reportTime}</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Legs; layover bar between leg 1 and 2 (same styling as TripLayoverBar) */}
      <div className="divide-y divide-gray-100">
        {legs.map((leg, idx) => {
          const isLastLeg = idx === legs.length - 1;
          const depTime = formatZuluOrLocalTime(leg.departureTime, leg.departureAirport);
          const arrTime = formatZuluOrLocalTime(leg.arrivalTime, leg.arrivalAirport);
          const crossesMidnight = formatArrivalNextDaySuffix(leg).trim() === "+1d";
          const arrDateBase = (leg.arrivalDate ?? leg.departureDate) ?? undefined;
          const arrDateStr = (() => {
            if (!isLastLeg) return "";
            if (timeMode === "local" && leg.arrivalTime && leg.arrivalAirport && arrDateBase) {
              return formatLocalDate(
                getLocalDateFromZulu(arrDateBase, leg.arrivalTime, leg.arrivalAirport),
                { weekday: false, year: false }
              );
            }
            return arrDateBase
              ? arrDateBase.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
              : "";
          })();
          const duration =
            typeof leg.flyingTime === "number"
              ? creditHoursToHumanReadable(leg.flyingTime)
              : null;
          const isDeadHead =
            (leg.flightNumber ?? "").toUpperCase().startsWith("DH");

          const showLayoverBarAfterThisLeg =
            trip.tripType === "LAYOVER" &&
            idx === 0 &&
            trip.layoverHours != null &&
            layoverCity &&
            layoverDurationLabel;

          return (
            <Fragment key={`leg-${idx}`}>
              <div className="grid grid-cols-1 gap-x-2 gap-y-0.5 py-1.5 text-sm max-sm:grid-cols-[1fr_auto] sm:grid-cols-[minmax(100px,1fr)_minmax(120px,1fr)_minmax(140px,1fr)_minmax(60px,auto)] sm:gap-x-3 sm:py-2.5 sm:items-center">
                <span className="col-span-full inline-flex min-w-0 flex-wrap items-center gap-1.5 font-semibold text-gray-900 sm:col-span-1 sm:gap-2">
                  <span className="min-w-0 break-words">{leg.departureAirport} → {leg.arrivalAirport}</span>
                  {isDeadHead && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-1.5 py-0.5 text-[9px] font-semibold text-purple-700 sm:px-2.5 sm:text-[10px]">
                      DH (No Duty)
                    </span>
                  )}
                </span>

                <span className="text-gray-600 max-sm:col-start-1">
                  Dep: {depTime}
                </span>

                <span className="text-gray-600 max-sm:col-start-2 max-sm:text-end max-sm:row-start-2 sm:col-auto sm:text-start">
                  Arr: {arrTime}
                  {crossesMidnight && <span className="ms-0.5 text-xs text-amber-500 sm:ms-1">+1d</span>}
                  {isLastLeg && arrDateStr && (
                    <span className="ms-0.5 text-xs text-gray-400 sm:ms-1">{arrDateStr}</span>
                  )}
                </span>

                {duration ? (
                  <span className="col-span-full text-xs text-gray-400 max-sm:pt-0.5 sm:col-span-1 sm:text-end sm:text-sm">
                    {duration}
                  </span>
                ) : null}
              </div>
              {showLayoverBarAfterThisLeg && (
                <div className="mx-0 my-1.5 rounded-lg border border-[#3BA34A]/20 bg-[#E8F5EA] px-2.5 py-2 sm:my-2 sm:px-3 sm:py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Moon size={18} className="shrink-0 text-[#3BA34A]" />
                    <span className="font-semibold text-[#3BA34A]">
                      Layover in {getAirportCity(layoverCity)}
                    </span>
                    <span className="font-medium text-[#3BA34A]/80">— {layoverDurationLabel}</span>
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {/* Fallback layover bar for quick posts / trips without leg data */}
      {legs.length === 0 && trip.tripType === "LAYOVER" && trip.layoverHours != null && layoverDurationLabel && (
        <div className="mx-0 mt-1.5 rounded-lg border border-[#3BA34A]/20 bg-[#E8F5EA] px-2.5 py-2 sm:mt-2 sm:px-3 sm:py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Moon size={18} className="shrink-0 text-[#3BA34A]" />
            <span className="font-semibold text-[#3BA34A]">
              Layover{layoverCity ? ` in ${getAirportCity(layoverCity)}` : ""}
            </span>
            <span className="font-medium text-[#3BA34A]/80">— {layoverDurationLabel}</span>
          </div>
        </div>
      )}

      {blockLabel ? (
        <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-gray-700 sm:mt-3">
          <span>Block: {blockLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

function ForDisplay({
  wantType,
  wantMinLayover,
  wantEqualHours,
  wantSameDate,
  wantDestinations,
  wantExclude,
  wantAcceptanceOptions,
  offeredDaysOff,
  wtfDays,
}: {
  wantType: WantType;
  wantMinLayover?: number | null;
  wantEqualHours?: boolean;
  wantSameDate?: boolean;
  wantDestinations?: string[];
  wantExclude?: string[];
  wantAcceptanceOptions?: WantAcceptanceOption[];
  offeredDaysOff?: number[];
  wtfDays?: number[];
}) {
  const hasPreferredDestinations = !!wantDestinations && wantDestinations.length > 0;
  const typeLabel = getWantTypeLabel(wantType);
  const showLayoverMin =
    (wantType === "LAYOVER" || wantType === "LONGER_LAYOVER") && wantMinLayover != null;
  const showAnyDestinationChip =
    !hasPreferredDestinations &&
    wantType !== "DAYS_OFF" &&
    wantType !== "ANYTHING" &&
    wantType !== "SPECIFIC";

  function formatAcceptance(opt: WantAcceptanceOption): string {
    const codes = opt.airportCodes.join("+");
    const parts: string[] = [codes];
    if (opt.minBlockHours != null) parts.push(`≥${opt.minBlockHours}h`);
    if (opt.maxBlockHours != null) parts.push(`≤${opt.maxBlockHours}h`);
    return parts.filter(Boolean).join(" ");
  }

  return (
    <div className="space-y-2.5 text-sm text-slate-700">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <span className="inline-flex max-w-full items-center rounded-full bg-slate-200/90 px-2.5 py-1 text-sm font-semibold text-slate-800">
          <span className="truncate">{typeLabel}</span>
          {showLayoverMin ? (
            <span className="ms-1 shrink-0 font-medium text-slate-600">· {wantMinLayover}h</span>
          ) : null}
        </span>

        {hasPreferredDestinations && (
          <>
            <span className="text-sm font-medium text-slate-500">Want</span>
            {wantDestinations!.map((d) => (
              <span
                key={d}
                className="rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-semibold text-emerald-800"
              >
                {d}
              </span>
            ))}
          </>
        )}

        {showAnyDestinationChip && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200/80">
            Any destination
          </span>
        )}

        {wantExclude && wantExclude.length > 0 && (
          <>
            <span className="text-sm font-medium text-slate-500">No</span>
            {wantExclude.map((d) => (
              <span
                key={d}
                className="rounded-full bg-rose-100 px-2.5 py-1 text-sm font-semibold text-rose-800"
              >
                {d}
              </span>
            ))}
          </>
        )}

        {wantEqualHours && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-700">
            Equal hours
          </span>
        )}
        {wantSameDate && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-700">
            Same date
          </span>
        )}
      </div>

      {wantAcceptanceOptions && wantAcceptanceOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-sm text-slate-700">
          <span className="font-semibold text-slate-600">Accept:</span>
          {wantAcceptanceOptions.map((opt, i) => (
            <Fragment key={i}>
              {i > 0 && <span className="text-slate-400">· or ·</span>}
              <span className="rounded-md bg-violet-50 px-2.5 py-1 font-medium text-violet-900">
                {formatAcceptance(opt)}
              </span>
            </Fragment>
          ))}
        </div>
      )}

      {wtfDays && wtfDays.length > 0 && (
        <p className="text-sm leading-snug text-slate-700">
          <span className="font-semibold text-indigo-800">Willing to fly:</span>{" "}
          {formatPreferenceDays(wtfDays)}
        </p>
      )}
      {wantType === "DAYS_OFF" && offeredDaysOff && offeredDaysOff.length > 0 && (
        <p className="text-sm leading-snug text-slate-700">
          <span className="font-semibold text-amber-800">For days off:</span>{" "}
          {formatPreferenceDays(offeredDaysOff)}
        </p>
      )}
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return formatDisplayDate(d);
}

const ACTIVE_PILL = "var(--primary)";
const PENDING_PILL = "#d97706";
const COMPLETED_PILL = "var(--accent)";
const EXPIRED_PILL = "#64748b";
const CANCELLED_PILL = "#94a3b8";

interface SwapPostTradeBoardCardProps {
  post: PostCardData;
  isPreview?: boolean;
  onMessage?: () => void;
  /** When set, shows a pill above the card (e.g. in My Swaps). */
  statusPill?: "active" | "pending" | "completed" | "expired" | "cancelled";
}

function getPillStyle(pill: NonNullable<SwapPostTradeBoardCardProps["statusPill"]>) {
  if (pill === "active") return { backgroundColor: ACTIVE_PILL };
  if (pill === "pending") return { backgroundColor: PENDING_PILL };
  if (pill === "expired") return { backgroundColor: EXPIRED_PILL };
  if (pill === "cancelled") return { backgroundColor: CANCELLED_PILL };
  return { backgroundColor: COMPLETED_PILL };
}

function getPillLabel(pill: NonNullable<SwapPostTradeBoardCardProps["statusPill"]>) {
  if (pill === "active") return "Active";
  if (pill === "pending") return "Pending";
  if (pill === "expired") return "Expired";
  if (pill === "cancelled") return "Cancelled";
  return "Completed";
}

export function SwapPostTradeBoardCard({ post, isPreview, onMessage, statusPill }: SwapPostTradeBoardCardProps) {
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean;
    feature?: string;
    reason?: string;
  }>({ open: false });
  const syntheticQuickTrip: TripRow[] =
    post.offeredTrips.length === 0 &&
    post.quickTripType &&
    post.quickDestinations &&
    post.quickDestinations.length > 0 &&
    post.quickDate
      ? (() => {
          const dests = collapseConsecutiveAirports(
            post.quickDestinations.map((c) => normalizeAirportCode(String(c)))
          );
          return [
            {
              flightNumber: post.advancedFlightNumber ?? "",
              destination: dests[0] ?? "",
              destinations: dests,
              departureDate: new Date(post.quickDate),
              tripType: post.quickTripType,
              creditHours: post.advancedBlockHours ?? 0,
              blockHours: post.advancedBlockHours ?? 0,
              hasLayover: post.quickTripType === "LAYOVER",
              layoverHours: post.quickLayoverHours ?? null,
              reportTime: post.advancedReportTime ?? undefined,
            },
          ];
        })()
      : [];
  const offeringTrips = post.offeredTrips.length > 0 ? post.offeredTrips : syntheticQuickTrip;
  const totalHours = offeringTrips.reduce((s, t) => s + (t.blockHours ?? t.creditHours ?? 0), 0);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {statusPill && (
        <div className="border-b border-slate-100 bg-slate-50/50 px-2.5 py-1.5 sm:px-3 sm:py-2">
          <span
            className="inline-block rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={getPillStyle(statusPill)}
          >
            {getPillLabel(statusPill)}
          </span>
        </div>
      )}
      <div className="border-b border-slate-100">
        <div className="flex flex-col gap-2 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-3 sm:py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)]/10"
          >
            <span className="text-xs font-semibold text-[var(--primary)]">
              {post.user.firstName[0]}
            </span>
          </div>
          <div>
            <span className="text-sm font-medium text-slate-900">{post.user.rank.name}</span>
            <span className="ms-1 text-xs text-slate-500">· {post.user.base.name} Base</span>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
          {post.source === "MANUAL_QUICK" ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-600">
              Quick post
            </span>
          ) : null}
          {post.source === "SCHEDULE_PREFILL" ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200/80">
              From schedule
            </span>
          ) : null}
          {typeof post.matchPercent === "number" && post.matchPercent > 0 && (
            <MatchBadge
              percent={post.matchPercent}
              tier={post.matchTier}
              reasons={post.matchReasons ?? []}
              userTier={post.userTier ?? "PREMIUM"}
            />
          )}
          {(post.userTier ?? "PREMIUM") === "FREE" &&
            post.matchTier &&
            post.matchTier !== "none" &&
            (post.matchPercent == null || post.matchPercent <= 0) && (
              <MatchBadge
                percent={null}
                tier={post.matchTier}
                reasons={[]}
                showTooltip={false}
                userTier="FREE"
              />
            )}
          {(() => {
            const d = post.createdAt ? new Date(post.createdAt) : null;
            const valid = d && !Number.isNaN(d.getTime());
            return valid ? <span className="text-xs text-slate-500">{formatTimeAgo(d)}</span> : null;
          })()}
          {!isPreview && onMessage && (
            <button
              type="button"
              onClick={onMessage}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1"
              style={{ backgroundColor: "var(--primary-cta)" }}
            >
              <MessageCircle size={16} />
              Message
            </button>
          )}
        </div>
        </div>
      </div>

      {post.postType === "VACATION_SWAP" ? (
        <div className="border-b border-slate-100 px-2.5 py-2 sm:px-3 sm:py-2.5">
          <p className={CARD_SECTION_LABEL}>Offering</p>
          {(() => {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const hasBlock =
              post.vacationYear != null && post.vacationMonth != null && post.vacationMonth >= 1 && post.vacationMonth <= 12;
            const periodOnly = hasBlock
              ? `${monthNames[post.vacationMonth! - 1]} ${post.vacationYear}${post.vacationStartDay != null && post.vacationEndDay != null ? ` (${post.vacationStartDay}–${post.vacationEndDay})` : ""}`
              : post.vacationStartDate && post.vacationEndDate
                ? `${formatDisplayDate(post.vacationStartDate)} – ${formatDisplayDate(post.vacationEndDate)}`
                : null;
            const wantLabel =
              post.desiredVacationMonths && post.desiredVacationMonths.length > 0
                ? post.desiredVacationMonths
                    .slice()
                    .sort((a, b) => a - b)
                    .map((m) => monthNames[m - 1])
                    .join(", ")
                : post.desiredVacationStart && post.desiredVacationEnd
                  ? `${formatDisplayDate(post.desiredVacationStart)} – ${formatDisplayDate(post.desiredVacationEnd)}`
                  : null;
            if (periodOnly != null || wantLabel != null) {
              return (
                <div className="rounded-lg border border-violet-200 bg-violet-50/80 px-2.5 py-2.5 text-sm leading-snug text-violet-900 sm:px-3 sm:py-3">
                  <p className="font-semibold">🏖️ Vacation Swap</p>
                  {periodOnly ? (
                    <p className="mt-1.5">
                      <span className="font-medium">Offering:</span> {periodOnly}
                    </p>
                  ) : null}
                  {wantLabel ? (
                    <p className="mt-0.5">
                      <span className="font-medium">Looking for:</span> {wantLabel}
                    </p>
                  ) : null}
                </div>
              );
            }
            return null;
          })()}
        </div>
      ) : (
        <div className="grid grid-cols-1 border-b border-slate-100 lg:grid-cols-2 lg:items-stretch lg:divide-x lg:divide-slate-100">
          <div className="flex min-h-0 min-w-0 flex-col px-2.5 py-2 sm:px-3 sm:py-2.5">
            <p className={CARD_SECTION_LABEL}>
              {offeringTrips.length > 1
                ? `Offering (${offeringTrips.length} trips · ${creditHoursToHumanReadable(totalHours)})`
                : "Offering"}
            </p>
            {offeringTrips.length > 0 ||
            (post.offeringDaysOff && post.offeredDaysOff && post.offeredDaysOff.length > 0) ? (
              <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3">
                {offeringTrips.length > 0 ? (
                  <div className="min-w-0 space-y-2">
                    {offeringTrips.map((trip, i) => (
                      <div
                        key={i}
                        className={
                          offeringTrips.length > 1 &&
                          typeof post.bestTripIndex === "number" &&
                          post.bestTripIndex === i &&
                          typeof post.matchPercent === "number" &&
                          post.matchPercent > 0
                            ? "rounded-lg ring-2 ring-[#3BA34A]/25 sm:rounded-md"
                            : ""
                        }
                      >
                        <OfferingTripRow trip={trip} />
                      </div>
                    ))}
                  </div>
                ) : null}
                {offeringTrips.length > 1 && (
                  <div className="mt-3 text-center text-sm text-slate-500">
                    📦 Package deal — swap all {offeringTrips.length} trips together
                  </div>
                )}
                {post.offeringDaysOff && post.offeredDaysOff && post.offeredDaysOff.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1 text-sm text-slate-700">
                    <span>Days off: {post.offeredDaysOff.join(", ")}</span>
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <div className="flex min-h-0 min-w-0 flex-col border-t border-slate-100 px-2.5 py-2 sm:px-3 sm:py-2.5 lg:border-t-0">
            <p className={CARD_SECTION_LABEL}>For</p>
            <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3">
              <ForDisplay
                wantType={post.wantType}
                wantMinLayover={post.wantMinLayover}
                wantEqualHours={post.wantEqualHours}
                wantSameDate={post.wantSameDate}
                wantDestinations={post.wantDestinations}
                wantExclude={post.wantExclude}
                wantAcceptanceOptions={post.wantAcceptanceOptions}
                offeredDaysOff={post.offeredDaysOff}
                wtfDays={post.wtfDays}
              />
            </div>
          </div>
        </div>
      )}

      <NotesDisplay
        notes={post.notes ?? null}
        isTruncated={post.notesIsTruncated ?? false}
        onUpgradeClick={
          post.notesIsTruncated
            ? () =>
                setUpgradeModal({
                  open: true,
                  feature: "full_notes",
                  reason:
                    "Full swap notes are available on Premium so you can review details before messaging.",
                })
            : undefined
        }
      />

      <UpgradeModal
        isOpen={upgradeModal.open}
        feature={upgradeModal.feature}
        reason={upgradeModal.reason}
        onClose={() => setUpgradeModal({ open: false })}
      />
    </div>
  );
}
