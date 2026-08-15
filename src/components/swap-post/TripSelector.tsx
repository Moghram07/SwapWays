"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { getTripTypeInfo, type TripType } from "@/utils/tripClassifier";
import { getAirportCity } from "@/utils/airportNames";
import { decimalHoursToDisplayTime, roundLayoverHours } from "@/utils/timeUtils";
import { formatDisplayDate } from "@/utils/dateUtils";
import { useDashboardLocale } from "@/contexts/DashboardLocaleContext";
import { getTranslator } from "@/i18n/getTranslator";
import { TripBoardPreview } from "@/components/swap-post/TripBoardPreview";
import type { TripBoardPreviewLayover } from "@/components/swap-post/TripBoardPreview";
import { zuluToLocal, getAirportUtcOffset } from "@/utils/airportTimezones";
import { useAirlineCode } from "@/hooks/useAirlineCode";

const PRIMARY = "#1E6FB9";

// ── Time conversion helpers ──────────────────────────────────────────────────

/** "HH.MMZ" or "HH:MM" zulu → "HH:MM" local at airport */
function zuluHHMMToLocal(zulu: string, airport: string): string {
  if (!zulu || !airport) return zulu;
  const r = zuluToLocal(zulu.replace(":", ".") + "Z", airport);
  return r.localTime;
}

/** "HH:MM" local at airport → "HH:MM" zulu */
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

/** "02.45Z" → "02:45" */
function scheduleTimeToInput(s: string | undefined): string {
  if (!s) return "";
  return s.replace("Z", "").trim().replace(".", ":");
}

/** "02:45" → "02.45Z" */
function inputToScheduleTime(s: string): string {
  const t = s.trim().replace(":", ".");
  if (!t) return "";
  return t.endsWith("Z") ? t : t + "Z";
}

// ── Layover helpers ──────────────────────────────────────────────────────────

function getPossibleLayoverAirports(legs: TripEditLeg[]): string[] {
  const arrivals = legs.slice(0, -1).map((l) => l.arrivalAirport).filter(Boolean);
  return [...new Set(arrivals)];
}

// ── Types ────────────────────────────────────────────────────────────────────

function tripBadgeLabel(type: TripType, t: (key: string) => string): string {
  switch (type) {
    case "LAYOVER":    return t("dashboard.tripBadgeLayover");
    case "TURNAROUND": return t("dashboard.tripBadgeTurnaround");
    case "MULTI_STOP": return t("dashboard.tripBadgeMultiStop");
    default:           return type;
  }
}

export interface TripOption {
  id: string;
  tripNumber: string;
  startDate: Date;
  creditHours: number;
  blockHours?: number | null;
  tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
  legs: { flightNumber: string; departureAirport: string; arrivalAirport: string; arrivalDate?: string | Date }[];
  layovers: { airport: string; durationDecimal: number }[];
}

interface TripEditLeg {
  id: string;
  dep: string;              // HH:MM zulu (stored)
  arr: string;              // HH:MM zulu (stored)
  departureAirport: string;
  arrivalAirport: string;
  isDeadhead: boolean;
}

interface TripEdit {
  loaded: boolean;
  tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
  reportTime: string;       // HH:MM zulu (stored)
  legs: TripEditLeg[];
  layovers: TripBoardPreviewLayover[];
  blockHours: number | null;
  startDate: Date;
  dirty: boolean;
  layoverAirport: string;
  layoverHours: number | null;
}

interface FetchedLeg {
  id: string;
  legOrder: number;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
}

interface TripSelectorProps {
  trips: TripOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onNext: () => void;
  onBack: () => void;
  allowEmpty?: boolean;
}

export function TripSelector({ trips, selected, onChange, onNext, onBack, allowEmpty }: TripSelectorProps) {
  const locale = useDashboardLocale();
  const t = getTranslator(locale);
  const airlineCode = useAirlineCode();

  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [tripEdits, setTripEdits] = useState<Record<string, TripEdit>>({});
  const [saving, setSaving] = useState(false);
  const [timeMode, setTimeMode] = useState<"local" | "zulu">("local");

  function displayFlightNumber(raw: string | undefined) {
    const s = (raw ?? "").trim();
    return s.toUpperCase().startsWith("DH") ? s.slice(2) : s;
  }

  async function loadTripEdit(trip: TripOption) {
    if (tripEdits[trip.id]?.loaded) return;
    setTripEdits((prev) => ({
      ...prev,
      [trip.id]: {
        loaded: false,
        tripType: trip.tripType,
        reportTime: "",
        legs: [],
        layovers: trip.layovers,
        blockHours: trip.blockHours ?? null,
        startDate: trip.startDate,
        dirty: false,
        layoverAirport: trip.layovers[0]?.airport ?? "",
        layoverHours: roundLayoverHours(trip.layovers[0]?.durationDecimal),
      },
    }));
    try {
      const res = await fetch(`/api/schedule/trips/${trip.id}`);
      const json = await res.json();
      const data = json.data as {
        tripType: string;
        reportTime: string;
        blockHours: number | null;
        startDate: string;
        legDeadheadsOverride: boolean[] | null;
        legs: FetchedLeg[];
        layovers: { airport: string; durationDecimal: number }[];
      };
      const layover0 = data.layovers[0];
      setTripEdits((prev) => ({
        ...prev,
        [trip.id]: {
          loaded: true,
          tripType: data.tripType as TripEdit["tripType"],
          reportTime: scheduleTimeToInput(data.reportTime),
          legs: data.legs.map((l, i) => ({
            id: l.id,
            dep: scheduleTimeToInput(l.departureTime),
            arr: scheduleTimeToInput(l.arrivalTime),
            departureAirport: l.departureAirport,
            arrivalAirport: l.arrivalAirport,
            isDeadhead: data.legDeadheadsOverride?.[i] ?? l.flightNumber.toUpperCase().startsWith("DH"),
          })),
          layovers: data.layovers,
          blockHours: data.blockHours,
          startDate: new Date(data.startDate),
          dirty: false,
          layoverAirport: layover0?.airport ?? "",
          layoverHours: roundLayoverHours(layover0?.durationDecimal),
        },
      }));
    } catch {
      // leave unloaded — user can retry
    }
  }

  function toggle(trip: TripOption) {
    if (selected.includes(trip.id)) {
      onChange(selected.filter((s) => s !== trip.id));
      if (expandedTripId === trip.id) setExpandedTripId(null);
    } else {
      onChange([...selected, trip.id]);
      setExpandedTripId(trip.id);
      void loadTripEdit(trip);
    }
  }

  function updateEdit(tripId: string, patch: Partial<Omit<TripEdit, "legs">>) {
    setTripEdits((prev) => ({
      ...prev,
      [tripId]: { ...prev[tripId]!, ...patch, dirty: true },
    }));
  }

  function updateLeg(tripId: string, legIdx: number, patch: Partial<TripEditLeg>) {
    setTripEdits((prev) => {
      const edit = prev[tripId]!;
      const legs = [...edit.legs];
      legs[legIdx] = { ...legs[legIdx]!, ...patch };
      return { ...prev, [tripId]: { ...edit, legs, dirty: true } };
    });
  }

  function updateLayover(tripId: string, airport: string, hours: number | null) {
    setTripEdits((prev) => {
      const edit = prev[tripId]!;
      const newLayovers: TripBoardPreviewLayover[] = airport
        ? [{ airport, durationDecimal: hours ?? 0 }]
        : [];
      return {
        ...prev,
        [tripId]: { ...edit, layoverAirport: airport, layoverHours: hours, layovers: newLayovers, dirty: true },
      };
    });
  }

  async function handleNext() {
    const dirtyEntries = Object.entries(tripEdits).filter(([, d]) => d.loaded && d.dirty);
    if (dirtyEntries.length > 0) {
      setSaving(true);
      for (const [tripId, data] of dirtyEntries) {
        await fetch(`/api/schedule/trips/${tripId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripType: data.tripType,
            reportTime: inputToScheduleTime(data.reportTime),
            legDeadheads: data.legs.map((l) => l.isDeadhead),
            legs: data.legs.map((l) => ({
              id: l.id,
              departureTime: inputToScheduleTime(l.dep),
              arrivalTime: inputToScheduleTime(l.arr),
            })),
            ...(data.tripType === "LAYOVER" && data.layoverAirport
              ? { layoverCity: data.layoverAirport, layoverHours: data.layoverHours ?? 0 }
              : {}),
          }),
        });
      }
      setSaving(false);
    }
    onNext();
  }

  const selectedTrips = trips.filter((t) => selected.includes(t.id));
  const totalCredit = selectedTrips.reduce((sum, t) => sum + t.creditHours, 0);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-content">{t("dashboard.tripSelectTitle")}</h2>
      <p className="text-sm text-muted">{t("dashboard.tripSelectSubtitle")}</p>

      <div className="space-y-2">
        {trips.map((trip) => {
          const isSelected = selected.includes(trip.id);
          const isExpanded = isSelected && expandedTripId === trip.id;
          const typeInfo = getTripTypeInfo(trip.tripType);
          const typeLabel = tripBadgeLabel(trip.tripType, t);
          const edit = tripEdits[trip.id];

          let destinationLabel: string;
          if (trip.tripType === "TURNAROUND" || trip.tripType === "LAYOVER") {
            const firstArrival = trip.legs[0]?.arrivalAirport;
            destinationLabel = firstArrival ? getAirportCity(firstArrival) : "—";
          } else {
            const destinations = [...new Set(trip.legs.map((l) => l.arrivalAirport).filter(Boolean))];
            destinationLabel = destinations.map((d) => getAirportCity(d)).join(" + ") || "—";
          }

          const firstDepAirport = edit?.legs[0]?.departureAirport ?? "";

          return (
            <div
              key={trip.id}
              className={`overflow-hidden rounded-xl border-2 transition-colors ${
                isSelected ? "border-[#2668B0]" : "border-line"
              }`}
            >
              {/* Clickable card row */}
              <button
                type="button"
                onClick={() => toggle(trip)}
                className="w-full p-3 text-start hover:bg-black/[0.02]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                        isSelected ? "border-[#2668B0] bg-[#2668B0]" : "border-line"
                      }`}
                    >
                      {isSelected && <Check size={14} className="text-white" />}
                    </div>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${typeInfo.bgColor} ${typeInfo.textColor}`}>
                      {typeLabel}
                    </span>
                    <div className="min-w-0">
                      <span className="font-semibold text-content">
                        {airlineCode}{displayFlightNumber(trip.legs[0]?.flightNumber) || "—"}
                      </span>
                      {trip.legs.some((l) => (l.flightNumber ?? "").toUpperCase().startsWith("DH")) && (
                        <span className="ms-2 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted">
                          {t("dashboard.tripDeadHeadBadge")}
                        </span>
                      )}
                      <span className="mx-1 text-faint">·</span>
                      <span className="text-sm text-muted">{destinationLabel}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-end text-sm text-muted">
                    <div>{formatDisplayDate(trip.startDate)}</div>
                    <div>{t("dashboard.tripRowCreditLabel")} {decimalHoursToDisplayTime(trip.creditHours)}</div>
                  </div>
                </div>
              </button>

              {/* Inline edit panel */}
              {isExpanded && (
                <div className="border-t border-line bg-surface-2 p-4 space-y-4">
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
                    <span className="text-xs text-slate-300">|</span>
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

                  {!edit?.loaded ? (
                    <p className="text-sm text-faint">Loading trip details…</p>
                  ) : (
                    <>
                      {/* Live board preview */}
                      <TripBoardPreview
                        tripType={edit.tripType}
                        legs={edit.legs.map((l) => ({
                          departureAirport: l.departureAirport,
                          arrivalAirport: l.arrivalAirport,
                          departureTime: l.dep,
                          isDeadhead: l.isDeadhead,
                        }))}
                        layovers={edit.layovers}
                        reportTime={edit.reportTime}
                        blockHours={edit.blockHours}
                        startDate={edit.startDate}
                      />

                      {/* Trip type */}
                      <div>
                        <p className="mb-2 text-xs font-medium text-muted">Trip type</p>
                        <div className="grid grid-cols-3 gap-2">
                          {(["LAYOVER", "TURNAROUND", "MULTI_STOP"] as const).map((type) => {
                            const info = getTripTypeInfo(type);
                            const active = edit.tripType === type;
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => updateEdit(trip.id, { tripType: type })}
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
                      {edit.tripType === "LAYOVER" && (() => {
                        const possibleAirports = getPossibleLayoverAirports(edit.legs);
                        return (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-muted">Layover city</label>
                              <select
                                value={edit.layoverAirport}
                                onChange={(e) => updateLayover(trip.id, e.target.value, edit.layoverHours)}
                                className="mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-content"
                              >
                                {!edit.layoverAirport && <option value="">Select city</option>}
                                {possibleAirports.map((apt) => (
                                  <option key={apt} value={apt}>{apt} — {getAirportCity(apt)}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-muted">Layover hours</label>
                              <input
                                type="number"
                                min={0}
                                step={0.5}
                                placeholder="e.g. 14"
                                value={edit.layoverHours ?? ""}
                                onChange={(e) =>
                                  updateLayover(
                                    trip.id,
                                    edit.layoverAirport,
                                    e.target.value ? parseFloat(e.target.value) : null
                                  )
                                }
                                className="mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-content"
                              />
                            </div>
                          </div>
                        );
                      })()}

                      {/* Report time */}
                      <div>
                        <label className="block text-xs font-medium text-muted">
                          Report time {timeMode === "local" && firstDepAirport ? `(${firstDepAirport} local)` : "(Zulu)"}
                        </label>
                        <input
                          type="time"
                          step={60}
                          value={toDisplay(edit.reportTime, firstDepAirport, timeMode)}
                          onChange={(e) =>
                            updateEdit(trip.id, {
                              reportTime: fromInput(e.target.value, firstDepAirport, timeMode),
                            })
                          }
                          className="mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-content"
                        />
                      </div>

                      {/* Leg times + DH toggle */}
                      {edit.legs.map((leg, i) => (
                        <div key={leg.id} className="rounded-lg border border-line bg-surface p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-medium text-muted">
                              {leg.departureAirport} → {leg.arrivalAirport}
                            </p>
                            <label className="flex cursor-pointer items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={leg.isDeadhead}
                                onChange={(e) => updateLeg(trip.id, i, { isDeadhead: e.target.checked })}
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
                                  updateLeg(trip.id, i, {
                                    dep: fromInput(e.target.value, leg.departureAirport, timeMode),
                                  })
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
                                  updateLeg(trip.id, i, {
                                    arr: fromInput(e.target.value, leg.arrivalAirport, timeMode),
                                  })
                                }
                                className="mt-0.5 block w-full rounded border border-line px-2 py-1.5 text-sm text-content"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div
          className="flex items-center justify-between rounded-lg px-4 py-3"
          style={{ backgroundColor: `${PRIMARY}12` }}
        >
          <span className="text-sm font-medium" style={{ color: PRIMARY }}>
            {selected.length === 1
              ? t("dashboard.tripSelectSelectedOne")
              : t("dashboard.tripSelectSelectedMany").replace("{n}", String(selected.length))}
          </span>
          <span className="text-sm" style={{ color: PRIMARY }}>
            {t("dashboard.tripSelectTotalCredit")} {decimalHoursToDisplayTime(totalCredit)}
          </span>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-slate-800 bg-surface px-4 py-2 text-sm font-medium text-content hover:bg-surface-2"
        >
          <span className="inline-flex items-center gap-1">
            <span className="rtl:rotate-180" aria-hidden>←</span>
            {t("dashboard.postFlowBack")}
          </span>
        </button>
        <button
          type="button"
          onClick={() => void handleNext()}
          disabled={(!allowEmpty && selected.length === 0) || saving}
          className="rounded-lg bg-slate-800 px-6 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <span className="inline-flex items-center gap-1">
            {saving ? "Saving…" : t("dashboard.postFlowNext")}
            {!saving && <span className="rtl:rotate-180" aria-hidden>→</span>}
          </span>
        </button>
      </div>
    </div>
  );
}
