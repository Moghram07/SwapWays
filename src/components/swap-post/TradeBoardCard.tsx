"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { MessageCircle, Clock, Timer, Pencil } from "lucide-react";
import { getTripTypeInfo } from "@/utils/tripClassifier";
import { creditHoursToHumanReadable, formatZuluTime } from "@/utils/timeUtils";
import { formatDisplayDate, formatLocalDate } from "@/utils/dateUtils";
import { zuluToLocal, getLocalDateFromZulu } from "@/utils/airportTimezones";
import { buildTripRouteChainNodes } from "@/utils/multiStopRouteDisplay";
import { getAirportCity } from "@/utils/airportNames";
import { RouteChain } from "@/components/RouteChain";
import { formatFlightNumber } from "@/utils/flightNumber";
import { useTimeFormat } from "@/hooks/useTimeFormat";
import { TripTypeBadge } from "@/components/trip/TripTypeBadge";
import { MatchBadge } from "@/components/swap-post/MatchBadge";
import { NotesDisplay } from "@/components/swap-post/NotesDisplay";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import type { WantAcceptanceOption } from "@/types/swapPost";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

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
  layoverCity?: string | null;
  layoverHours?: number | null;
  legLayovers?: Array<{ legIndex: number; city?: string; hours?: number; layoverHours?: number }> | null;
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
  const { format: timeMode } = useTimeFormat();

  const legs = trip.legs ?? [];
  const firstLeg = legs[0];
  const lastLeg = legs.length > 0 ? legs[legs.length - 1] : undefined;
  const baseAirportCode = trip.baseAirportCode ?? firstLeg?.departureAirport ?? "";
  type Leg = NonNullable<TripRow["legs"]>[number];

  const routeChain = buildTripRouteChainNodes({
    destination: trip.destination,
    destinations: trip.destinations,
    baseCode: baseAirportCode || undefined,
    layoverCity:
      trip.tripType === "LAYOVER"
        ? (trip.layoverCity ?? trip.destination ?? null)
        : null,
    layoverHours: trip.layoverHours,
    legLayovers: trip.legLayovers as Array<{ legIndex: number; city?: string; hours?: number; layoverHours?: number }> | null,
    legs: trip.legs,
  });

  const typeInfo = getTripTypeInfo(trip.tripType, {
    legCount: trip.tripType === "MULTI_STOP" ? routeChain.length - 1 : undefined,
  });
  const flightNum = formatFlightNumber(firstLeg?.flightNumber ?? trip.flightNumber);

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
    // Schedule trips store report time in Zulu; quick/manual posts store local time directly.
    // Schedule trips always have legs populated; quick posts don't.
    const hasScheduleLegs = !!(trip.legs && trip.legs.length > 0);
    if (!hasScheduleLegs) {
      return trip.reportTime.replace(".", ":");
    }
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

  const isSchedulePost = legs.length > 0;
  const timeColor = isSchedulePost
    ? timeMode === "zulu" ? "text-[#2668B0]" : "text-[#3BA34A]"
    : undefined;
  const nodeTimes: (string | null)[] = routeChain.map((_node, i) => {
    if (!isSchedulePost) return null;
    if (i === 0) {
      const t = formatZuluOrLocalTime(legs[0]?.departureTime, legs[0]?.departureAirport);
      return t !== "—" ? t : null;
    }
    if (i === routeChain.length - 1) {
      const t = formatZuluOrLocalTime(lastLeg?.arrivalTime, lastLeg?.arrivalAirport);
      const suffix = lastLeg ? formatArrivalNextDaySuffix(lastLeg).trim() : "";
      return t !== "—" ? (suffix ? `${t} ${suffix}` : t) : null;
    }
    return null;
  });

  return (
    <div className={`w-full rounded-md bg-slate-50/80 p-2.5 sm:p-3 border-s-4 ${typeInfo.borderColor}`}>
      <div className="mb-2 sm:mb-3">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-1.5">
          <TripTypeBadge typeInfo={typeInfo} />
          <span className="text-sm font-medium text-gray-500">{dateRange}</span>
        </div>
        <div className="min-w-0 leading-snug">
          {flightNum && (
            <span className="mb-0.5 block text-xs font-medium text-gray-500">{flightNum}</span>
          )}
          <RouteChain nodes={routeChain} nodeTimes={nodeTimes} tripType={trip.tripType} timeColor={timeColor} />
        </div>
      </div>



      {(reportTime || blockLabel) && (
        <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Report: <span className="font-medium text-gray-700">{reportTime ?? "—"}</span></span>
          </span>
          <span className="flex items-center gap-1">
            <Timer className="h-3.5 w-3.5 shrink-0" />
            <span>Block: <span className="font-medium text-gray-700">{blockLabel ?? "—"}</span></span>
          </span>
        </div>
      )}
    </div>
  );
}

type CityPillVariant = "green" | "blue" | "orange" | "red" | "default";

const cityPillColors: Record<CityPillVariant, { border: string; bg: string; text: string; sub: string }> = {
  green:   { border: "border-[#3BA34A]", bg: "bg-green-50",  text: "text-[#3BA34A]",  sub: "text-[#3BA34A]/70" },
  blue:    { border: "border-[#2668B0]", bg: "bg-blue-50",   text: "text-[#2668B0]",  sub: "text-[#2668B0]/70" },
  orange:  { border: "border-amber-500", bg: "bg-amber-50",  text: "text-amber-700",  sub: "text-amber-600/70" },
  red:     { border: "border-rose-400",  bg: "bg-rose-50",   text: "text-rose-700",   sub: "text-rose-500/70"  },
  default: { border: "border-gray-200",  bg: "bg-white",     text: "text-gray-900",   sub: "text-gray-400"     },
};

function wantTypeToVariant(wantType: WantType): CityPillVariant {
  if (wantType === "LAYOVER" || wantType === "LONGER_LAYOVER") return "green";
  if (wantType === "ROUND_TRIP") return "blue";
  if (wantType === "ANY_FLIGHT") return "orange";
  return "default";
}

function CityPill({ code, variant = "default" }: { code: string; variant?: CityPillVariant }) {
  const c = cityPillColors[variant];
  return (
    <span className={`inline-flex flex-col items-center rounded-lg border ${c.border} ${c.bg} px-2 py-0.5 text-center leading-tight`}>
      <span className={`text-xs font-bold ${c.text}`}>{code}</span>
      <span className={`text-[9px] ${c.sub}`}>{getAirportCity(code)}</span>
    </span>
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
  const cities = wantDestinations ?? [];
  const hasCities = cities.length > 0;
  const isLayoverType = wantType === "LAYOVER" || wantType === "LONGER_LAYOVER";

  const layoverMin = isLayoverType && wantMinLayover != null ? wantMinLayover : null;

  function buildForSentence(): { prefix: string; showCities: boolean } {
    if (wantType === "ANYTHING") return { prefix: "Anything — open to offers", showCities: false };
    if (wantType === "DAYS_OFF") return { prefix: "Days off", showCities: false };
    if (isLayoverType) {
      if (hasCities) {
        return {
          prefix: layoverMin != null ? `Layover ≥${layoverMin}h in` : "Layover in",
          showCities: true,
        };
      }
      return {
        prefix: layoverMin != null ? `Any layover ≥${layoverMin}h` : "Any layover",
        showCities: false,
      };
    }
    if (wantType === "ROUND_TRIP") {
      return hasCities
        ? { prefix: "Round trip to", showCities: true }
        : { prefix: "Any destination", showCities: false };
    }
    if (wantType === "ANY_FLIGHT") {
      return hasCities
        ? { prefix: "Flight to", showCities: true }
        : { prefix: "Any destination", showCities: false };
    }
    return hasCities
      ? { prefix: getWantTypeLabel(wantType) + " to", showCities: true }
      : { prefix: getWantTypeLabel(wantType), showCities: false };
  }

  function formatAcceptance(opt: WantAcceptanceOption): string {
    const codes = opt.airportCodes.join("+");
    const parts: string[] = [codes];
    if (opt.minBlockHours != null) parts.push(`≥${opt.minBlockHours}h`);
    if (opt.maxBlockHours != null) parts.push(`≤${opt.maxBlockHours}h`);
    return parts.filter(Boolean).join(" ");
  }

  const { prefix, showCities } = buildForSentence();
  const pillVariant = wantTypeToVariant(wantType);

  return (
    <div className="space-y-2.5 text-sm text-slate-700">
      {/* Main sentence — no "For:" prefix, the section header already says "For" */}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
        <span className="font-medium text-slate-800">{prefix}</span>
        {showCities &&
          cities.map((code, i) => (
            <Fragment key={code}>
              {i > 0 && <span className="text-xs text-slate-300">·</span>}
              <CityPill code={code} variant={pillVariant} />
            </Fragment>
          ))}
      </div>

      {/* Secondary chips row */}
      {((wantExclude && wantExclude.length > 0) || wantEqualHours || wantSameDate) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          {wantExclude && wantExclude.length > 0 && (
            <>
              <span className="text-xs font-medium text-slate-500">No</span>
              {wantExclude.map((d) => (
                <CityPill key={d} code={d} variant="red" />
              ))}
            </>
          )}
          {wantEqualHours && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              Equal hours
            </span>
          )}
          {wantSameDate && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              Same date
            </span>
          )}
        </div>
      )}

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
  /** When true, this is the current user's own post — show Edit instead of Message. */
  isOwn?: boolean;
  /** Edit link href shown when isOwn is true. */
  editHref?: string;
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

export function SwapPostTradeBoardCard({ post, isPreview, onMessage, statusPill, isOwn, editHref }: SwapPostTradeBoardCardProps) {
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
          const raw = post.quickDestinations
            .map((c) => String(c).trim().toUpperCase())
            .filter(Boolean);
          const dests = raw.filter((c, i) => i === 0 || c !== raw[i - 1]);
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
              layoverCity: post.quickTripType === "LAYOVER" ? (dests[0] ?? null) : null,
              layoverHours: post.quickLayoverHours ?? null,
              reportTime: post.advancedReportTime ?? undefined,
              baseAirportCode: post.user.base.airportCode ?? undefined,
            },
          ];
        })()
      : [];
  const offeringTrips = (post.offeredTrips.length > 0 ? post.offeredTrips : syntheticQuickTrip).map(
    (t) => ({ ...t, baseAirportCode: t.baseAirportCode ?? post.user.base.airportCode ?? undefined })
  );
  const totalHours = offeringTrips.reduce((s, t) => s + (t.blockHours ?? t.creditHours ?? 0), 0);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {isOwn && !statusPill && (
        <div className="border-b border-[#2668B0]/20 bg-blue-50/60 px-2.5 py-1.5 sm:px-3 sm:py-2">
          <span className="inline-block rounded-full bg-[#2668B0] px-3 py-1 text-xs font-semibold text-white">
            Your post
          </span>
        </div>
      )}
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
            {(() => {
              const d = post.createdAt ? new Date(post.createdAt) : null;
              const valid = d && !Number.isNaN(d.getTime());
              return valid ? <span className="ms-1.5 text-xs text-slate-400">{formatTimeAgo(d)}</span> : null;
            })()}
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
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
          {!isPreview && isOwn && editHref && (
            <Link
              href={editHref}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary)] transition-colors hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1"
            >
              <Pencil size={15} />
              Edit
            </Link>
          )}
          {!isPreview && !isOwn && onMessage && (
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
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-3 sm:px-4">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Offering</span>
          <span className="text-base leading-none">🏖️</span>
          {post.vacationYear != null && post.vacationMonth != null && post.vacationMonth >= 1 && post.vacationMonth <= 12 ? (
            <span className="rounded-full bg-violet-100 px-3 py-0.5 text-sm font-bold text-violet-700">
              {MONTH_NAMES[post.vacationMonth - 1]} {post.vacationYear}
            </span>
          ) : null}
          {post.desiredVacationMonths && post.desiredVacationMonths.length > 0 ? (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">For</span>
          ) : null}
          {(post.desiredVacationMonths ?? []).slice().sort((a, b) => a - b).map((m) => (
            <span key={m} className="rounded-full bg-emerald-100 px-3 py-0.5 text-sm font-bold text-emerald-700">
              {MONTH_NAMES[m - 1]}
            </span>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 border-b border-slate-100 lg:grid-cols-2 lg:items-stretch lg:divide-x lg:divide-slate-100">
          <div className="flex min-h-0 min-w-0 flex-col">
            <p className={`${CARD_SECTION_LABEL} px-2.5 pt-2 sm:px-3 sm:pt-2.5`}>
              {offeringTrips.length > 1
                ? `Offering (${offeringTrips.length} trips · ${creditHoursToHumanReadable(totalHours)})`
                : "Offering"}
            </p>
            {offeringTrips.length > 0 ||
            (post.offeringDaysOff && post.offeredDaysOff && post.offeredDaysOff.length > 0) ? (
              <div className="min-w-0">
                {offeringTrips.length > 0 ? (
                  <div className="space-y-0">
                    {offeringTrips.map((trip, i) => (
                      <div
                        key={i}
                        className={
                          offeringTrips.length > 1 &&
                          typeof post.bestTripIndex === "number" &&
                          post.bestTripIndex === i &&
                          typeof post.matchPercent === "number" &&
                          post.matchPercent > 0
                            ? "ring-2 ring-inset ring-[#3BA34A]/25"
                            : ""
                        }
                      >
                        <OfferingTripRow trip={trip} />
                      </div>
                    ))}
                  </div>
                ) : null}
                {offeringTrips.length > 1 && (
                  <div className="px-2.5 pb-2 text-center text-sm text-slate-500 sm:px-3">
                    📦 Package deal — swap all {offeringTrips.length} trips together
                  </div>
                )}
                {post.offeringDaysOff && post.offeredDaysOff && post.offeredDaysOff.length > 0 && (
                  <div className="px-2.5 pb-2 flex flex-wrap items-center gap-1 text-sm text-slate-700 sm:px-3">
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
