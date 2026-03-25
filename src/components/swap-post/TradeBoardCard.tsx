"use client";

import { Fragment } from "react";
import { MessageCircle, Moon } from "lucide-react";
import { getTripTypeInfo } from "@/utils/tripClassifier";
import { creditHoursToHumanReadable, formatZuluTime } from "@/utils/timeUtils";
import { formatDisplayDate, formatLocalDate } from "@/utils/dateUtils";
import { zuluToLocal, getLocalDateFromZulu } from "@/utils/airportTimezones";
import { getAirportCity, getAirportDisplay } from "@/utils/airportNames";
import { useTimeFormat } from "@/hooks/useTimeFormat";
import { TripTypeBadge } from "@/components/trip/TripTypeBadge";
import { MatchBadge } from "@/components/swap-post/MatchBadge";

const PRIMARY = "var(--primary)";
const PRIMARY_CTA = "var(--primary-cta)";

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
  creditHours: number;
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
  offeredTrips: TripRow[];
  offeringDaysOff?: boolean;
  offeredDaysOff?: number[];
  wantType: WantType;
  wantMinLayover?: number | null;
  wantEqualHours?: boolean;
  wantSameDate?: boolean;
  wantDestinations?: string[];
  wantExclude?: string[];
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
  matchReasons?: string[];
}

function getWantTypeLabel(type: WantType): string {
  const labels: Record<WantType, string> = {
    LAYOVER: "Any layover",
    LONGER_LAYOVER: "Longer layover",
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

function OfferingTripRow({ trip, packageMode = false }: { trip: TripRow; packageMode?: boolean }) {
  const typeInfo = getTripTypeInfo(trip.tripType);
  const { format: timeMode } = useTimeFormat();

  const legs = trip.legs ?? [];
  const firstLeg = legs[0];
  const lastLeg = legs.length > 0 ? legs[legs.length - 1] : undefined;
  const baseAirportCode = trip.baseAirportCode ?? firstLeg?.departureAirport ?? "";
  type Leg = NonNullable<TripRow["legs"]>[number];

  const destinationCodes =
    trip.destinations && trip.destinations.length > 0
      ? trip.destinations
      : (() => {
          const seen = new Set<string>();
          const out: string[] = [];
          for (const l of legs) {
            const code = l.arrivalAirport;
            if (!code || code === baseAirportCode) continue;
            if (seen.has(code)) continue;
            seen.add(code);
            out.push(code);
          }
          return out;
        })();

  const destinationDisplay =
    trip.tripType === "MULTI_STOP"
      ? (destinationCodes.length ? destinationCodes.join(" + ") : trip.destination)
      : destinationCodes.length
        ? getAirportDisplay(destinationCodes[0])
        : getAirportDisplay(trip.destination);

  const dateRange = (() => {
    if (!firstLeg || !lastLeg || !trip.departureDate) return "—";

    const lastDate = lastLeg.arrivalDate ?? lastLeg.departureDate ?? trip.departureDate;

    if (timeMode === "local" && firstLeg.departureTime && firstLeg.departureAirport && lastLeg.arrivalTime && lastLeg.arrivalAirport) {
      const startLocal = getLocalDateFromZulu(trip.departureDate, firstLeg.departureTime, firstLeg.departureAirport);
      const endLocal = getLocalDateFromZulu(lastDate, lastLeg.arrivalTime, lastLeg.arrivalAirport);
      const startStr = formatLocalDate(startLocal, { weekday: false, year: false });
      const endStr = formatLocalDate(endLocal, { weekday: false, year: false });
      if (startLocal.year === endLocal.year && startLocal.month === endLocal.month && startLocal.day === endLocal.day) return startStr;
      return `${startStr} – ${endStr}`;
    }

    const startStr = trip.departureDate.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    const endStr = lastDate.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    if (startStr === endStr) return startStr;
    return `${startStr} – ${endStr}`;
  })();

  const blockLabel = creditHoursToHumanReadable(trip.creditHours);
  const tafbLabel =
    trip.tafb != null ? creditHoursToHumanReadable(trip.tafb) : null;

  const reportTime = (() => {
    if (!trip.reportTime) return "—";
    const reportAirport = trip.baseAirportCode ?? firstLeg?.departureAirport ?? "";
    if (!reportAirport) return "—";
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

  const renderLegLineTurnaroundOrMulti = (leg: Leg) => {
    const dep = `${leg.departureAirport} → ${leg.arrivalAirport}`;
    const depTime = formatZuluOrLocalTime(leg.departureTime, leg.departureAirport);
    const arrTimeBase = formatZuluOrLocalTime(leg.arrivalTime, leg.arrivalAirport);
    const arrTime = `${arrTimeBase}${formatArrivalNextDaySuffix(leg)}`;
    return `${dep}    ${depTime} → ${arrTime}`;
  };

  const renderLegLineLayover = (leg: Leg) => {
    const dep = `${leg.departureAirport} → ${leg.arrivalAirport}`;
    const depTime = formatZuluOrLocalTime(leg.departureTime, leg.departureAirport);
    const arrTimeBase = formatZuluOrLocalTime(leg.arrivalTime, leg.arrivalAirport);
    const arrTime = `${arrTimeBase}${formatArrivalNextDaySuffix(leg)}`;
    return `${dep}    Dep: ${depTime}    Arr: ${arrTime}`;
  };

  const layoverCity = trip.tripType === "LAYOVER" ? (legs[0]?.arrivalAirport ?? legs[1]?.departureAirport) : undefined;
  const layoverDurationLabel =
    trip.tripType === "LAYOVER" && trip.layoverHours != null ? creditHoursToHumanReadable(trip.layoverHours) : null;

  return (
    <div className={`w-full rounded-lg border border-slate-200 bg-white p-4 border-l-4 ${typeInfo.borderColor}`}>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <TripTypeBadge typeInfo={typeInfo} />
          <span className="text-sm text-gray-500 font-medium">{dateRange}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-gray-900 truncate pr-3">
            SV{firstLeg?.flightNumber ?? trip.flightNumber} · {destinationDisplay}
          </span>
          <span className="text-sm text-gray-500 whitespace-nowrap">
            Report: <span className="text-gray-700 font-medium">{reportTime}</span>
          </span>
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
              : "—";
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
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(100px,1fr)_minmax(120px,1fr)_minmax(140px,1fr)_minmax(60px,auto)] gap-x-4 gap-y-1 items-center py-2.5 text-sm">
                <span className="font-semibold text-gray-900 inline-flex items-center gap-2 min-w-0">
                  <span className="truncate">{leg.departureAirport} → {leg.arrivalAirport}</span>
                  {isDeadHead && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-semibold">
                      DH (No Duty)
                    </span>
                  )}
                </span>

                <span className="text-gray-600">
                  Dep: {depTime}
                </span>

                <span className="text-gray-600">
                  Arr: {arrTime}
                  {crossesMidnight && <span className="text-amber-500 text-xs ml-1">+1d</span>}
                  {isLastLeg && arrDateStr && (
                    <span className="text-gray-400 text-xs ml-1">{arrDateStr}</span>
                  )}
                </span>

                <span className="text-gray-400 text-xs text-right">
                  {duration}
                </span>
              </div>
              {showLayoverBarAfterThisLeg && (
                <div className="mx-0 my-2 rounded-lg border border-[#3BA34A]/20 bg-[#E8F5EA] px-4 py-3">
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

      <div className="mt-3 flex items-center justify-between gap-4 text-sm font-semibold text-gray-700">
        <span>Block: {blockLabel}</span>
        {tafbLabel ? <span>TAFB: {tafbLabel}</span> : null}
      </div>
    </div>
  );
}

function WantsDisplay({
  wantType,
  wantMinLayover,
  wantEqualHours,
  wantSameDate,
  wantDestinations,
  wantExclude,
  wtfDays,
}: {
  wantType: WantType;
  wantMinLayover?: number | null;
  wantEqualHours?: boolean;
  wantSameDate?: boolean;
  wantDestinations?: string[];
  wantExclude?: string[];
  wtfDays?: number[];
}) {
  const hasPreferredDestinations = !!wantDestinations && wantDestinations.length > 0;
  const shouldShowPrimarySummary =
    wantType !== "ANYTHING" || !hasPreferredDestinations;
  const primarySummary = shouldShowPrimarySummary ? getWantTypeLabel(wantType) : null;

  return (
    <div className="space-y-3">
      {(primarySummary || wantMinLayover != null) && (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <p className="text-sm font-medium text-slate-800">
            {primarySummary ?? "Open to offers"}
            {wantMinLayover != null ? (
              <span className="ml-1 font-normal text-slate-700">· Min layover {wantMinLayover}h</span>
            ) : null}
          </p>
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-2">
        {hasPreferredDestinations && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
            <p className="text-sm font-medium text-slate-800">Want</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {wantDestinations!.map((d) => (
                <span
                  key={d}
                  className="rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-medium text-emerald-700"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {wantExclude && wantExclude.length > 0 && (
          <div className="rounded-lg border border-rose-200 bg-rose-50/60 px-3 py-2">
            <p className="text-sm font-medium text-slate-800">NO</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {wantExclude.map((d) => (
                <span
                  key={d}
                  className="rounded-full bg-rose-100 px-2.5 py-1 text-sm font-medium text-rose-700"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {wtfDays && wtfDays.length > 0 && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-2 md:col-span-2">
            <p className="text-sm font-medium text-slate-800">
              Willing to fly: <span className="font-semibold text-indigo-700">{formatPreferenceDays(wtfDays)}</span>
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {wantEqualHours && (
          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-sm font-medium text-slate-700">
            Equal hours
          </span>
        )}
        {wantSameDate && (
          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-sm font-medium text-slate-700">
            Same date
          </span>
        )}
      </div>
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

interface SwapPostTradeBoardCardProps {
  post: PostCardData;
  isPreview?: boolean;
  onMessage?: () => void;
  /** When set, shows a pill above the card (e.g. in My Swaps). */
  statusPill?: "active" | "pending" | "completed";
}

function getPillStyle(pill: "active" | "pending" | "completed") {
  if (pill === "active") return { backgroundColor: ACTIVE_PILL };
  if (pill === "pending") return { backgroundColor: PENDING_PILL };
  return { backgroundColor: COMPLETED_PILL };
}

function getPillLabel(pill: "active" | "pending" | "completed") {
  if (pill === "active") return "Active";
  if (pill === "pending") return "Pending";
  return "Completed";
}

export function SwapPostTradeBoardCard({ post, isPreview, onMessage, statusPill }: SwapPostTradeBoardCardProps) {
  const totalHours = post.offeredTrips.reduce((s, t) => s + t.creditHours, 0);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {statusPill && (
        <div className="border-b border-slate-100 px-4 py-2 bg-slate-50/50">
          <span
            className="inline-block rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={getPillStyle(statusPill)}
          >
            {getPillLabel(statusPill)}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)]/10"
          >
            <span className="text-xs font-semibold text-[var(--primary)]">
              {post.user.firstName[0]}
            </span>
          </div>
          <div>
            <span className="text-sm font-medium text-slate-900">{post.user.rank.name}</span>
            <span className="ml-1 text-xs text-slate-500">· {post.user.base.name} Base</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {typeof post.matchPercent === "number" && post.matchPercent > 0 && (
            <MatchBadge percent={post.matchPercent} reasons={post.matchReasons ?? []} />
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

      <div className="px-4 py-3 border-b border-slate-100">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {post.postType === "VACATION_SWAP"
            ? "Offering"
            : post.offeredTrips.length > 1
              ? `Offering (${post.offeredTrips.length} trips · Total block: ${creditHoursToHumanReadable(totalHours)})`
              : "Offering"}
        </p>
        {post.postType === "VACATION_SWAP" ? (
          (() => {
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
                <div className="rounded-lg border border-violet-200 bg-violet-50/80 px-3 py-2.5 text-sm text-violet-900">
                  <span className="font-medium">Vacation </span>
                  <span>{periodOnly ?? "—"}</span>
                  <span className="mx-2 text-violet-400">→</span>
                  <span className="font-medium">Looking for </span>
                  <span>{wantLabel ?? "—"}</span>
                </div>
              );
            }
            return null;
          })()
        ) : post.offeredTrips.length > 0 ? (
          <div className="space-y-1.5">
            {post.offeredTrips.map((trip, i) => (
              <OfferingTripRow key={i} trip={trip} packageMode={post.offeredTrips.length > 1} />
            ))}
          </div>
        ) : null}
        {post.offeringDaysOff && post.offeredDaysOff && post.offeredDaysOff.length > 0 && (
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
            <span>Days off: {post.offeredDaysOff.join(", ")}</span>
          </div>
        )}
      </div>

      <div className="bg-slate-50/50 px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Looking For</p>
        <WantsDisplay
          wantType={post.wantType}
          wantMinLayover={post.wantMinLayover}
          wantEqualHours={post.wantEqualHours}
          wantSameDate={post.wantSameDate}
          wantDestinations={post.wantDestinations}
          wantExclude={post.wantExclude}
          wtfDays={post.wtfDays}
        />
      </div>

      {post.notes && (
        <div className="border-t border-slate-100 px-4 py-2">
          <p className="text-sm italic text-slate-600">&quot;{post.notes}&quot;</p>
        </div>
      )}
    </div>
  );
}
