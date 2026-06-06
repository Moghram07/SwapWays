"use client";

import { useCallback, useEffect, useState } from "react";
import type { TripCardData } from "@/types/tripCard";
import { getTripTypeInfo } from "@/utils/tripClassifier";
import { TripBoardPreview } from "@/components/swap-post/TripBoardPreview";
import type { TripBoardPreviewLayover } from "@/components/swap-post/TripBoardPreview";
import { zuluToLocal, getAirportUtcOffset } from "@/utils/airportTimezones";
import { getAirportCity } from "@/utils/airportNames";

// ── Time conversion helpers ──────────────────────────────────────────────────

function zuluHHMMToLocal(zulu: string, airport: string): string {
  if (!zulu || !airport) return zulu;
  const r = zuluToLocal(zulu.replace(":", ".") + "Z", airport);
  return r.localTime;
}

function localHHMMToZulu(local: string, airport: string): string {
  if (!local || !airport) return local;
  const [hStr = "0", mStr = "0"] = local.split(":");
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  const offset = getAirportUtcOffset(airport);
  let zuluMin = h * 60 + m - Math.round(offset * 60);
  if (zuluMin < 0) zuluMin += 1440;
  else if (zuluMin >= 1440) zuluMin -= 1440;
  const zh = Math.floor(zuluMin / 60);
  const zm = Math.round(zuluMin % 60);
  return `${zh.toString().padStart(2, "0")}:${zm.toString().padStart(2, "0")}`;
}

function toDisplay(zulu: string, airport: string, mode: "local" | "zulu"): string {
  return mode === "local" && airport ? zuluHHMMToLocal(zulu, airport) : zulu;
}

function fromInput(input: string, airport: string, mode: "local" | "zulu"): string {
  return mode === "local" && airport ? localHHMMToZulu(input, airport) : input;
}

// ── Schedule time helpers ────────────────────────────────────────────────────

function scheduleTimeToInput(timeStr: string | undefined): string {
  if (!timeStr) return "";
  return timeStr.replace("Z", "").trim().replace(".", ":");
}

function inputToScheduleTime(s: string): string {
  const t = s.trim().replace(":", ".");
  if (!t) return "";
  return t.endsWith("Z") ? t : t + "Z";
}

function getPossibleLayoverAirports(legs: Array<{ arrivalAirport: string }>): string[] {
  const arrivals = legs.slice(0, -1).map((l) => l.arrivalAirport).filter(Boolean);
  return [...new Set(arrivals)];
}

// ── Types ────────────────────────────────────────────────────────────────────

interface FetchedLeg {
  id: string;
  legOrder: number;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  departureDate: string;
  arrivalDate: string;
  departureAirport: string;
  arrivalAirport: string;
}

interface FetchedTrip {
  id: string;
  tripType: string;
  reportTime: string;
  blockHours: number | null;
  startDate: string;
  legDeadheadsOverride: boolean[] | null;
  legs: FetchedLeg[];
  layovers: { airport: string; durationDecimal: number }[];
}

interface EditTripModalProps {
  scheduleTripId: string;
  trip: TripCardData;
  onClose: () => void;
  onSaved: () => void;
}

export function EditTripModal({
  scheduleTripId,
  trip,
  onClose,
  onSaved,
}: EditTripModalProps) {
  const [tripType, setTripType] = useState(trip.tripType);
  const [reportTime, setReportTime] = useState("");
  const [legs, setLegs] = useState<Array<{
    id: string;
    dep: string;            // HH:MM zulu (stored)
    arr: string;            // HH:MM zulu (stored)
    departureAirport: string;
    arrivalAirport: string;
    isDeadhead: boolean;
  }>>([]);
  const [layovers, setLayovers] = useState<TripBoardPreviewLayover[]>([]);
  const [layoverAirport, setLayoverAirport] = useState("");
  const [layoverHours, setLayoverHours] = useState<number | null>(null);
  const [blockHours, setBlockHours] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date>(trip.startDate);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeMode, setTimeMode] = useState<"local" | "zulu">("local");

  const firstDepAirport = legs[0]?.departureAirport ?? "";

  // Layover duration as separate hours/minutes fields (the stored value is decimal hours,
  // e.g. 16h35m = 16.5833…, which is ugly to edit directly).
  const layoverHM = (() => {
    if (layoverHours == null) return { hours: "", minutes: "" };
    let h = Math.floor(layoverHours);
    let m = Math.round((layoverHours - h) * 60);
    if (m === 60) {
      h += 1;
      m = 0;
    }
    return { hours: String(h), minutes: String(m) };
  })();

  const setLayoverFromHM = (hoursStr: string, minutesStr: string) => {
    const h = hoursStr === "" ? 0 : Math.max(0, parseInt(hoursStr, 10) || 0);
    const m = minutesStr === "" ? 0 : Math.max(0, Math.min(59, parseInt(minutesStr, 10) || 0));
    if (hoursStr === "" && minutesStr === "") {
      setLayoverHours(null);
      return;
    }
    setLayoverHours(h + m / 60);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/schedule/trips/${scheduleTripId}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.message ?? "Failed to load trip");
        return;
      }
      const json = await res.json().catch(() => ({}));
      const data = json.data as FetchedTrip;
      setTripType(data.tripType as typeof tripType);
      setReportTime(scheduleTimeToInput(data.reportTime));
      setBlockHours(data.blockHours);
      setStartDate(new Date(data.startDate));
      setLayovers(data.layovers ?? []);
      const layover0 = data.layovers?.[0];
      setLayoverAirport(layover0?.airport ?? "");
      setLayoverHours(layover0?.durationDecimal ?? null);
      setLegs(
        data.legs.map((l, i) => ({
          id: l.id,
          dep: scheduleTimeToInput(l.departureTime),
          arr: scheduleTimeToInput(l.arrivalTime),
          departureAirport: l.departureAirport,
          arrivalAirport: l.arrivalAirport,
          isDeadhead: data.legDeadheadsOverride?.[i] ?? l.flightNumber.toUpperCase().startsWith("DH"),
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load trip");
    } finally {
      setLoading(false);
    }
  }, [scheduleTripId]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep layovers array in sync with layoverAirport/Hours for the board preview
  useEffect(() => {
    if (tripType === "LAYOVER" && layoverAirport) {
      setLayovers([{ airport: layoverAirport, durationDecimal: layoverHours ?? 0 }]);
    }
  }, [tripType, layoverAirport, layoverHours]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: {
        reportTime?: string;
        tripType?: string;
        legDeadheads?: boolean[];
        legs?: Array<{ id: string; departureTime?: string; arrivalTime?: string }>;
        layoverCity?: string;
        layoverHours?: number;
      } = {};
      if (tripType !== trip.tripType) body.tripType = tripType;
      const rt = inputToScheduleTime(reportTime);
      if (rt) body.reportTime = rt;
      body.legDeadheads = legs.map((l) => l.isDeadhead);
      body.legs = legs.map((leg) => {
        const dep = inputToScheduleTime(leg.dep);
        const arr = inputToScheduleTime(leg.arr);
        return {
          id: leg.id,
          ...(dep && { departureTime: dep }),
          ...(arr && { arrivalTime: arr }),
        };
      });
      if (tripType === "LAYOVER" && layoverAirport) {
        body.layoverCity = layoverAirport;
        body.layoverHours = layoverHours ?? 0;
      }
      const res = await fetch(`/api/schedule/trips/${scheduleTripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.message ?? "Failed to save");
        return;
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const updateLeg = (index: number, patch: Partial<typeof legs[0]>) => {
    setLegs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, ...patch };
      return next;
    });
  };

  const possibleLayoverAirports = getPossibleLayoverAirports(legs);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold text-content">Edit trip</h2>
          <p className="mt-1 text-sm text-muted">
            {trip.legs[0]?.flightNumber ? `Trip ${trip.legs[0].flightNumber}` : ""} — correct details before posting
          </p>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 max-h-[80vh] overflow-y-auto">
          {loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : (
            <div className="space-y-4">
              {/* Live board preview */}
              <TripBoardPreview
                tripType={tripType}
                legs={legs.map((l) => ({
                  departureAirport: l.departureAirport,
                  arrivalAirport: l.arrivalAirport,
                  departureTime: l.dep,
                  isDeadhead: l.isDeadhead,
                }))}
                layovers={layovers}
                reportTime={reportTime}
                blockHours={blockHours}
                startDate={startDate}
              />

              {/* Time mode toggle */}
              <div className="flex items-center justify-end gap-1">
                <span className="text-xs text-muted">Time:</span>
                <button
                  type="button"
                  onClick={() => setTimeMode("local")}
                  className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                    timeMode === "local"
                      ? "bg-green-100 text-green-700"
                      : "text-faint hover:text-muted"
                  }`}
                >
                  Local
                </button>
                <span className="text-xs text-gray-300">|</span>
                <button
                  type="button"
                  onClick={() => setTimeMode("zulu")}
                  className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                    timeMode === "zulu"
                      ? "bg-blue-100 text-blue-700"
                      : "text-faint hover:text-muted"
                  }`}
                >
                  Zulu
                </button>
              </div>

              {/* Trip type */}
              <div>
                <label className="mb-2 block text-sm font-medium text-content-soft">Trip type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["LAYOVER", "TURNAROUND", "MULTI_STOP"] as const).map((type) => {
                    const info = getTripTypeInfo(type);
                    const active = tripType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTripType(type)}
                        className={`rounded-lg border-2 py-2 text-xs font-medium transition-colors ${
                          active
                            ? "border-slate-700 bg-slate-800 text-white"
                            : "border-line bg-surface text-muted hover:border-line"
                        }`}
                      >
                        {info.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Layover city + hours — shown when LAYOVER */}
              {tripType === "LAYOVER" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-content-soft">Layover city</label>
                    <select
                      value={layoverAirport}
                      onChange={(e) => setLayoverAirport(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-line px-3 py-2 text-sm text-content"
                    >
                      {!layoverAirport && <option value="">Select city</option>}
                      {possibleLayoverAirports.map((apt) => (
                        <option key={apt} value={apt}>{apt} — {getAirportCity(apt)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-content-soft">Layover duration</label>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={layoverHM.hours}
                          onChange={(e) => setLayoverFromHM(e.target.value, layoverHM.minutes)}
                          className="block w-16 rounded-lg border border-line px-2 py-2 text-sm text-content"
                        />
                        <span className="text-sm text-muted">h</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={59}
                          step={5}
                          placeholder="0"
                          value={layoverHM.minutes}
                          onChange={(e) => setLayoverFromHM(layoverHM.hours, e.target.value)}
                          className="block w-16 rounded-lg border border-line px-2 py-2 text-sm text-content"
                        />
                        <span className="text-sm text-muted">m</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Report time */}
              <div>
                <label className="block text-sm font-medium text-content-soft">
                  Report time {timeMode === "local" && firstDepAirport ? `(${firstDepAirport} local)` : "(Zulu)"}
                </label>
                <input
                  type="time"
                  step={60}
                  value={toDisplay(reportTime, firstDepAirport, timeMode)}
                  onChange={(e) => setReportTime(fromInput(e.target.value, firstDepAirport, timeMode))}
                  className="mt-1 block w-full rounded-lg border border-line px-3 py-2 text-sm text-content"
                />
              </div>

              {/* Leg times + DH toggle */}
              {legs.map((leg, index) => (
                <div key={leg.id} className="rounded-lg border border-line bg-surface-2 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-medium text-content-soft">
                      {leg.departureAirport} → {leg.arrivalAirport}
                    </div>
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={leg.isDeadhead}
                        onChange={(e) => updateLeg(index, { isDeadhead: e.target.checked })}
                        className="h-3.5 w-3.5 rounded accent-purple-600"
                      />
                      <span className="text-xs text-purple-600">Dead head</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted">
                        Dep {timeMode === "local" && leg.departureAirport ? `(${leg.departureAirport})` : "(Z)"}
                      </label>
                      <input
                        type="time"
                        step={60}
                        value={toDisplay(leg.dep, leg.departureAirport, timeMode)}
                        onChange={(e) =>
                          updateLeg(index, { dep: fromInput(e.target.value, leg.departureAirport, timeMode) })
                        }
                        className="mt-0.5 block w-full rounded border border-line px-2 py-1.5 text-sm text-content"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted">
                        Arr {timeMode === "local" && leg.arrivalAirport ? `(${leg.arrivalAirport})` : "(Z)"}
                      </label>
                      <input
                        type="time"
                        step={60}
                        value={toDisplay(leg.arr, leg.arrivalAirport, timeMode)}
                        onChange={(e) =>
                          updateLeg(index, { arr: fromInput(e.target.value, leg.arrivalAirport, timeMode) })
                        }
                        className="mt-0.5 block w-full rounded border border-line px-2 py-1.5 text-sm text-content"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
          <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-content-soft hover:bg-surface-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || saving}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
