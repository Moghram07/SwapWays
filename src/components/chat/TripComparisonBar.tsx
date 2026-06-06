"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { classifyTrip, getTripTypeInfo } from "@/utils/tripClassifier";
import { zuluToLocal } from "@/utils/airportTimezones";
import { formatFlightNumber } from "@/utils/flightNumber";
import { AirportCode } from "@/components/AirportCode";

interface Leg {
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime?: string;
  arrivalTime?: string;
}

interface TripLike {
  tripNumber?: string;
  startDate: string | Date;
  legs: Leg[];
  layovers?: unknown[];
  reportTime?: string | null;
  /** Manual trips store local report time and have no per-leg times. */
  isManual?: boolean;
}

/** Round Trip: only destination (e.g. RUH). Pairing/Pairing with Layover: first destination → … → last; omit base at start and end. */
function formatDestination(
  legs: Leg[],
  tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP"
): string {
  if (!legs.length) return "—";
  const firstLeg = legs[0];
  const base = firstLeg.departureAirport;
  if ((tripType === "TURNAROUND" || tripType === "LAYOVER") || legs.length === 1) return firstLeg.arrivalAirport;
  const codes: string[] = legs.map((leg) => leg.arrivalAirport);
  if (codes[codes.length - 1] === base) codes.pop();
  return codes.join(" → ");
}

/** Normalize time string (e.g. "08:26" or "08.26") and convert to local at airport; return display label or raw. */
function toLocalTimeLabel(raw: string | undefined | null, airportCode: string): string {
  if (raw == null || raw === "") return "—";
  const normalized = (raw ?? "").trim().replace(":", ".");
  if (!normalized) return raw;
  try {
    const result = zuluToLocal(normalized, airportCode);
    return result?.label ?? raw;
  } catch {
    return raw;
  }
}

/** An offerable trip: an uploaded schedule trip OR a posted (often manual) swap-post trip. */
interface MyTripOption {
  /** scheduleTripId when kind === "schedule", swapPostTripId when kind === "swapPostTrip". */
  id: string;
  kind: "schedule" | "swapPostTrip";
  label: string;
}

interface ScheduleTripApiItem {
  id: string;
  startDate: string;
  legs: { flightNumber: string; departureAirport: string; arrivalAirport: string }[];
}

function scheduleOptionLabel(t: ScheduleTripApiItem): string {
  const firstLeg = t.legs?.[0];
  const fn = formatFlightNumber(firstLeg?.flightNumber) ?? "—";
  const dest = firstLeg?.arrivalAirport ?? "—";
  const d = new Date(t.startDate);
  const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fn} · ${dest} · ${dateStr}`;
}

interface SwapPostTripApiItem {
  id: string;
  scheduleTripId: string | null;
  flightNumber: string | null;
  destination: string;
  destinations?: string[];
  departureDate: string;
}

function swapTripOptionLabel(t: SwapPostTripApiItem): string {
  const fn = formatFlightNumber(t.flightNumber);
  const dest = (t.destinations && t.destinations[0]) || t.destination || "—";
  const d = new Date(t.departureDate);
  const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fn ? `${fn} · ` : ""}${dest} · ${dateStr}`;
}

interface TripOfferSelectorProps {
  yourTrip: TripLike | null;
  trips: MyTripOption[];
  loading: boolean;
  saving: boolean;
  canChangeOffer: boolean;
  currentOfferId: string | null | undefined;
  onSelect: (option: MyTripOption | null) => void;
  onDropdownOpenChange?: (open: boolean) => void;
  onOpenRequested: () => void;
}

const TripOfferSelector = memo(function TripOfferSelector({
  yourTrip,
  trips,
  loading,
  saving,
  canChangeOffer,
  currentOfferId,
  onSelect,
  onDropdownOpenChange,
  onOpenRequested,
}: TripOfferSelectorProps) {
  void currentOfferId;
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const openedAtRef = useRef<number>(0);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; minWidth: number } | null>(null);

  useEffect(() => {
    if (isOpen && canChangeOffer && pickerRef.current) {
      const rect = pickerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        minWidth: rect.width,
      });
    } else {
      setDropdownPosition(null);
    }
  }, [isOpen, canChangeOffer]);

  useEffect(() => {
    if (!isOpen || loading) return;
    let listener: ((e: MouseEvent) => void) | null = null;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      listener = (e: MouseEvent) => {
        const target = e.target as Node;
        const insideTrigger = pickerRef.current?.contains(target);
        const insideDropdown = dropdownRef.current?.contains(target);
        if (insideTrigger || insideDropdown) return;
        if (Date.now() - openedAtRef.current < 300) return;
        setIsOpen(false);
        onDropdownOpenChange?.(false);
      };
      document.addEventListener("mousedown", listener);
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (listener) {
        document.removeEventListener("mousedown", listener);
      }
    };
  }, [isOpen, loading, onDropdownOpenChange]);

  const handleSelect = (option: MyTripOption | null) => {
    onSelect(option);
    setIsOpen(false);
    onDropdownOpenChange?.(false);
  };

  return (
    <div
      ref={pickerRef}
      className={`relative rounded-lg border-2 p-2.5 w-full ${
        yourTrip
          ? "border-[#1E6FB9] bg-surface"
          : "border-dashed border-line bg-surface-2"
      } ${canChangeOffer ? "cursor-pointer hover:bg-surface-2/80" : ""}`}
      onMouseDown={(e) => {
        if (!canChangeOffer) return;
        // prevent text selection on long-press; actual open happens on click
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        if (!canChangeOffer) return;
        e.preventDefault();
        e.stopPropagation();
        openedAtRef.current = Date.now();
        setIsOpen(true);
        onDropdownOpenChange?.(true);
        onOpenRequested();
      }}
      onKeyDown={(e) => {
        if (canChangeOffer && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          setIsOpen((o) => {
            const next = !o;
            if (next) {
              openedAtRef.current = Date.now();
              onOpenRequested();
            }
            onDropdownOpenChange?.(next);
            return next;
          });
        }
      }}
      role={canChangeOffer ? "button" : undefined}
      tabIndex={canChangeOffer ? 0 : undefined}
      aria-label={canChangeOffer ? "Change offered trip" : undefined}
    >
      {yourTrip ? (
        <TripMiniSummary trip={yourTrip} />
      ) : (
        <p className="text-sm text-content-soft italic">No trip selected yet</p>
      )}
      {isOpen &&
        canChangeOffer &&
        dropdownPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            className="rounded-lg border border-line bg-surface shadow-lg py-2 max-h-60 overflow-y-auto z-[9999]"
            style={{
              position: "fixed",
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              minWidth: dropdownPosition.minWidth,
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {loading ? (
              <p className="px-3 py-2 text-sm text-content">Loading…</p>
            ) : (
              <>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-content hover:bg-surface-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(null);
                  }}
                  disabled={saving}
                >
                  No trip
                </button>
                {trips.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted">
                    You haven&apos;t posted a trip yet.{" "}
                    <Link
                      href="/dashboard/add-trade"
                      className="font-medium text-[#1E6FB9] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Post a swap
                    </Link>{" "}
                    to offer one here.
                  </div>
                ) : (
                  trips.map((t) => (
                    <button
                      key={`${t.kind}:${t.id}`}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-content hover:bg-surface-2 disabled:opacity-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(t);
                      }}
                      disabled={saving}
                    >
                      {t.label}
                    </button>
                  ))
                )}
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
});

export const TripComparisonBar = memo(function TripComparisonBar({
  theirTrip,
  yourTrip,
  isInitiator,
  conversationId,
  currentOfferId,
  onOfferChanged,
  onDropdownOpenChange,
}: {
  theirTrip: TripLike | null;
  yourTrip: TripLike | null;
  isInitiator: boolean;
  conversationId?: string | null;
  currentOfferId?: string | null;
  onOfferChanged?: () => void;
  onDropdownOpenChange?: (open: boolean) => void;
}) {
  const [myTrips, setMyTrips] = useState<MyTripOption[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [saving, setSaving] = useState(false);
  const canChangeOffer = isInitiator && conversationId && onOfferChanged;

  const fetchMyTrips = useCallback(() => {
    if (!canChangeOffer) return;
    setLoadingTrips(true);
    Promise.all([
      fetch("/api/schedule/my-trips").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/swap-posts?mine=1&scope=active").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([schedJson, swapJson]) => {
        const options: MyTripOption[] = [];
        // Uploaded schedule trips (unchanged behavior for schedule users).
        const schedTrips: ScheduleTripApiItem[] = Array.isArray(schedJson?.data) ? schedJson.data : [];
        for (const t of schedTrips) {
          options.push({ id: t.id, kind: "schedule", label: scheduleOptionLabel(t) });
        }
        // Posted swap trips from My Swaps — add the MANUAL ones (schedule-backed are already above).
        const posts: { offeredTrips?: SwapPostTripApiItem[] }[] = Array.isArray(swapJson?.data) ? swapJson.data : [];
        for (const p of posts) {
          for (const ot of p.offeredTrips ?? []) {
            if (ot.scheduleTripId) continue;
            options.push({ id: ot.id, kind: "swapPostTrip", label: swapTripOptionLabel(ot) });
          }
        }
        setMyTrips(options);
      })
      .catch(() => setMyTrips([]))
      .finally(() => setLoadingTrips(false));
  }, [canChangeOffer]);

  const handleSelectTrip = useCallback(
    async (option: MyTripOption | null) => {
      if (!conversationId || !onOfferChanged) return;
      const newId = option?.id ?? null;
      if (newId === currentOfferId) return;
      setSaving(true);
      const body = option
        ? option.kind === "schedule"
          ? { scheduleTripId: option.id }
          : { swapPostTripId: option.id }
        : { scheduleTripId: null };
      const res = await fetch(`/api/conversations/${conversationId}/offer-trip`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSaving(false);
      if (res.ok) {
        onOfferChanged();
      }
    },
    [conversationId, currentOfferId, onOfferChanged]
  );

  return (
    <div className="w-full flex flex-col gap-2">
      <TripOfferSelector
        yourTrip={yourTrip}
        trips={myTrips}
        loading={loadingTrips}
        saving={saving}
        canChangeOffer={!!canChangeOffer}
        currentOfferId={currentOfferId}
        onSelect={handleSelectTrip}
        onDropdownOpenChange={onDropdownOpenChange}
        onOpenRequested={fetchMyTrips}
      />
      <div className="rounded-lg border-2 border-line bg-surface p-2.5 w-full">
        {theirTrip ? (
          <TripMiniSummary trip={theirTrip} />
        ) : (
          <p className="text-sm text-content-soft italic">No trip</p>
        )}
      </div>
    </div>
  );
});

function TripMiniSummary({ trip }: { trip: TripLike }) {
  const firstLeg = trip.legs?.[0];
  const lastLeg = trip.legs?.length ? trip.legs[trip.legs.length - 1] : null;
  if (!firstLeg) return <p className="text-sm text-muted">—</p>;
  const tripType = classifyTrip({
    legs: trip.legs ?? [],
    layovers: trip.layovers ?? [],
  });
  const typeInfo = getTripTypeInfo(tripType);
  const startDate =
    typeof trip.startDate === "string"
      ? new Date(trip.startDate)
      : trip.startDate;
  const dateStr = startDate.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const destStr = formatDestination(trip.legs ?? [], tripType);
  const base = firstLeg.departureAirport;
  // Manual trips store local report time (and have no per-leg times) — show it as entered.
  const report = trip.isManual
    ? (trip.reportTime && trip.reportTime.trim() ? trip.reportTime.replace(".", ":") : "—")
    : toLocalTimeLabel(trip.reportTime, base);
  const departure = toLocalTimeLabel(firstLeg.departureTime, base);
  const returnToBase = toLocalTimeLabel(
    lastLeg?.arrivalTime,
    lastLeg?.arrivalAirport ?? base
  );

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
        <span
          className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${typeInfo.bgColor} ${typeInfo.textColor}`}
        >
          {typeInfo.label}
        </span>
        {formatFlightNumber(firstLeg.flightNumber) && (
          <span className="font-semibold text-content">{formatFlightNumber(firstLeg.flightNumber)}</span>
        )}
        <span className="flex items-center gap-1 text-muted">
          {destStr.split(" → ").map((code, i, arr) => (
            <span key={i} className="flex items-center gap-1">
              <AirportCode code={code} />
              {i < arr.length - 1 && <span className="text-faint">→</span>}
            </span>
          ))}
        </span>
        <span className="text-muted">{dateStr}</span>
      </div>
      <div className="text-xs text-content-soft">
        Report: {report} · Departure: {departure} · Return to base: {returnToBase}
      </div>
    </div>
  );
}
