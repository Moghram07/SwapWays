"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { createPortal } from "react-dom";
import { classifyTrip, getTripTypeInfo } from "@/utils/tripClassifier";
import { zuluToLocal } from "@/utils/airportTimezones";

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
}

/** Round Trip: only destination (e.g. RUH). Multi-stop: first destination → … → last; omit base at start and end. */
function formatDestination(
  legs: Leg[],
  tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP"
): string {
  if (!legs.length) return "—";
  const firstLeg = legs[0];
  const base = firstLeg.departureAirport;
  if (tripType === "TURNAROUND" || legs.length === 1) return firstLeg.arrivalAirport;
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

interface MyTripOption {
  id: string;
  startDate: string;
  legs: { flightNumber: string; departureAirport: string; arrivalAirport: string }[];
}

function tripOptionLabel(t: MyTripOption): string {
  const firstLeg = t.legs?.[0];
  const fn = firstLeg?.flightNumber ? `SV${firstLeg.flightNumber}` : "—";
  const dest = firstLeg?.arrivalAirport ?? "—";
  const d = new Date(t.startDate);
  const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fn} · ${dest} · ${dateStr}`;
}

interface TripOfferSelectorProps {
  yourTrip: TripLike | null;
  trips: MyTripOption[];
  loading: boolean;
  saving: boolean;
  canChangeOffer: boolean;
  currentOfferId: string | null | undefined;
  onSelect: (scheduleTripId: string) => void;
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

  const handleSelect = (scheduleTripId: string) => {
    onSelect(scheduleTripId);
    setIsOpen(false);
    onDropdownOpenChange?.(false);
  };

  return (
    <div
      ref={pickerRef}
      className={`relative rounded-lg border-2 p-2.5 w-full ${
        yourTrip
          ? "border-[#1E6FB9] bg-white"
          : "border-dashed border-slate-300 bg-slate-50"
      } ${canChangeOffer ? "cursor-pointer hover:bg-slate-50/80" : ""}`}
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
        <p className="text-sm text-slate-700 italic">No trip selected yet</p>
      )}
      {isOpen &&
        canChangeOffer &&
        dropdownPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            className="rounded-lg border border-slate-200 bg-white shadow-lg py-2 max-h-60 overflow-y-auto z-[9999]"
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
              <p className="px-3 py-2 text-sm text-slate-800">Loading…</p>
            ) : (
              <>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-slate-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect("");
                  }}
                  disabled={saving}
                >
                  No trip
                </button>
                {trips.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 disabled:opacity-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(t.id);
                    }}
                    disabled={saving}
                  >
                    {tripOptionLabel(t)}
                  </button>
                ))}
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
    fetch("/api/schedule/my-trips")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        setMyTrips(Array.isArray(json?.data) ? json.data : []);
      })
      .catch(() => setMyTrips([]))
      .finally(() => setLoadingTrips(false));
  }, [canChangeOffer]);

  const handleSelectTrip = useCallback(
    async (scheduleTripId: string) => {
      if (!conversationId || !onOfferChanged) return;
      const value = scheduleTripId === "" ? null : scheduleTripId;
      if (value === currentOfferId) return;
      setSaving(true);
      const res = await fetch(`/api/conversations/${conversationId}/offer-trip`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleTripId: value }),
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
      <div className="rounded-lg border-2 border-slate-300 bg-white p-2.5 w-full">
        {theirTrip ? (
          <TripMiniSummary trip={theirTrip} />
        ) : (
          <p className="text-sm text-slate-700 italic">No trip</p>
        )}
      </div>
    </div>
  );
});

function TripMiniSummary({ trip }: { trip: TripLike }) {
  const firstLeg = trip.legs?.[0];
  const lastLeg = trip.legs?.length ? trip.legs[trip.legs.length - 1] : null;
  if (!firstLeg) return <p className="text-sm text-slate-500">—</p>;
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
  const report = toLocalTimeLabel(trip.reportTime, base);
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
        <span className="font-semibold text-slate-900">SV{firstLeg.flightNumber}</span>
        <span className="text-slate-600">{destStr}</span>
        <span className="text-slate-500">{dateStr}</span>
      </div>
      <div className="text-xs text-slate-700">
        Report: {report} · Departure: {departure} · Return to base: {returnToBase}
      </div>
    </div>
  );
}
