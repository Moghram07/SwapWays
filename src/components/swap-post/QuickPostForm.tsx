"use client";

import { useMemo } from "react";
import { Moon } from "lucide-react";
import { getAllAirports } from "@/utils/airportNames";
import { normalizeFlightNumberInput } from "@/utils/flightNumber";
import type { QuickPostOfferedTripData, QuickPostLegEntry, WantCriteriaData } from "@/types/swapPost";
import { WtfDayPicker } from "@/components/swap/WtfDayPicker";
import { WantDestinationsField, ExcludeDestinationsField } from "@/components/swap/WantDestinationsField";
import { MAX_TRIPS_PER_POST, MIN_TRIPS_PER_POST } from "@/constants/swapPost";

interface QuickPostFormProps {
  offeredTrips: QuickPostOfferedTripData[];
  wantCriteria: WantCriteriaData;
  selectedDaysOff: number[];
  month: number;
  year: number;
  scheduledDays: number[];
  onOfferedTripsChange: (value: QuickPostOfferedTripData[]) => void;
  onWantCriteriaChange: (value: WantCriteriaData) => void;
  onSelectedDaysOffChange: (value: number[]) => void;
  onBack: () => void;
  onNext: () => void;
}

type TripTypeKey = QuickPostOfferedTripData["tripType"];

const tripTypeOptions: Array<{ value: TripTypeKey; label: string; color: string; activeClass: string }> = [
  { value: "TURNAROUND", label: "Round Trip", color: "border-[#2668B0]", activeClass: "border-[#2668B0] bg-[#E3EFF9] text-[#2668B0]" },
  { value: "LAYOVER",    label: "Layover",    color: "border-[#3BA34A]", activeClass: "border-[#3BA34A] bg-[#E8F5EA] text-[#3BA34A]" },
  { value: "MULTI_STOP", label: "Pairing",    color: "border-amber-500", activeClass: "border-amber-500 bg-amber-50 text-amber-700" },
  {
    value: "PAIRING_WITH_LAYOVER",
    label: "Pairing with Layover",
    color: "border-purple-500",
    activeClass: "border-purple-500 bg-purple-50 text-purple-700",
  },
];

const returnTripTypeOptions: Array<{ value: WantCriteriaData["wantType"]; label: string }> = [
  { value: "LAYOVER",    label: "Layover" },
  { value: "ROUND_TRIP", label: "Round trip" },
  { value: "ANY_FLIGHT", label: "Any flight" },
  { value: "DAYS_OFF",   label: "Days off" },
];

const MIN_LEG_STOPS = 2;
const MAX_LEG_STOPS = 5;

function defaultLegs(): QuickPostLegEntry[] {
  return [
    { to: "", hasLayover: false, layoverHours: null },
    { to: "", hasLayover: false, layoverHours: null },
  ];
}

function legsToDestinations(legs: QuickPostLegEntry[]): string[] {
  return legs.map((l) => l.to).filter(Boolean);
}

function legsToPrimaryLayover(legs: QuickPostLegEntry[]): number | null {
  return legs.find((l) => l.hasLayover)?.layoverHours ?? null;
}

function legsHaveAnyLayover(legs: QuickPostLegEntry[]): boolean {
  return legs.some((l) => l.hasLayover);
}

function createEmptyTrip(): QuickPostOfferedTripData {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    tripType: "LAYOVER",
    destination: "",
    destinations: [""],
    date: "",
    layoverHours: null,
    reportTime: "",
    aircraftTypeCode: "",
    blockHours: null,
    flightNumber: "",
  };
}

function formatHours(decimal: number): string {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function normalizeTimeValue(raw: string): string {
  return raw.trim().replace(".", ":").replace(/Z$/i, "");
}

function sanitizeTimeInput(raw: string): string {
  const normalized = raw.replace(/[^\d:.]/g, "").replace(".", ":");
  if (!normalized) return "";
  if (!normalized.includes(":")) {
    const digits = normalized.slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  }
  const [h = "", m = ""] = normalized.split(":", 2);
  const hh = h.slice(0, 2);
  const mm = m.slice(0, 2);
  return `${hh}:${mm}`;
}

function isValidTimeValue(raw: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(normalizeTimeValue(raw));
}

function isPairingType(t: TripTypeKey): t is "MULTI_STOP" | "PAIRING_WITH_LAYOVER" {
  return t === "MULTI_STOP" || t === "PAIRING_WITH_LAYOVER";
}

export function QuickPostForm({
  offeredTrips,
  wantCriteria,
  selectedDaysOff,
  month,
  year,
  scheduledDays,
  onOfferedTripsChange,
  onWantCriteriaChange,
  onSelectedDaysOffChange,
  onBack,
  onNext,
}: QuickPostFormProps) {
  const airports = useMemo(() => getAllAirports(), []);
  const internationalAirports = useMemo(() => airports.filter((a) => !a.isDomestic), [airports]);
  const totalBlockHours = offeredTrips.reduce((sum, trip) => sum + (trip.blockHours ?? 0), 0);
  const canAddMore = offeredTrips.length < MAX_TRIPS_PER_POST;

  const openAny = wantCriteria.wantOpenToAnyDestination ?? false;
  const wantsOk =
    wantCriteria.wantType === "DAYS_OFF"
      ? selectedDaysOff.length > 0
      : openAny || wantCriteria.wantDestinations.length > 0;

  const wtfOk = wantCriteria.wtfDays.length > 0;

  const canProceed =
    offeredTrips.length >= MIN_TRIPS_PER_POST &&
    offeredTrips.every((trip) => {
      if (!trip.date) return false;
      if (!isValidTimeValue(trip.reportTime ?? "")) return false;
      if (isPairingType(trip.tripType)) {
        const legs = trip.legs ?? [];
        return (
          legs.length >= MIN_LEG_STOPS &&
          legs.every((l) => l.to && (!l.hasLayover || (l.layoverHours ?? 0) > 0))
        );
      }
      if (!trip.destination) return false;
      if (trip.tripType === "LAYOVER") {
        return (trip.layoverHours ?? 0) > 0;
      }
      return true;
    }) &&
    wantsOk &&
    wtfOk;

  const updateTrip = (tripId: number | undefined, updates: Partial<QuickPostOfferedTripData>) => {
    onOfferedTripsChange(
      offeredTrips.map((trip) => (trip.id === tripId ? { ...trip, ...updates } : trip))
    );
  };

  const removeTrip = (tripId: number | undefined) => {
    if (offeredTrips.length <= MIN_TRIPS_PER_POST) return;
    onOfferedTripsChange(offeredTrips.filter((trip) => trip.id !== tripId));
  };

  const addTrip = () => {
    if (!canAddMore) return;
    onOfferedTripsChange([...offeredTrips, createEmptyTrip()]);
  };

  function handleTripTypeChange(trip: QuickPostOfferedTripData, newType: TripTypeKey) {
    const currentLegs = trip.legs ?? defaultLegs();
    if (isPairingType(newType)) {
      const legs = isPairingType(trip.tripType) ? currentLegs : defaultLegs();
      updateTrip(trip.id, {
        tripType: newType,
        legs,
        destinations: legsToDestinations(legs),
        destination: legsToDestinations(legs)[0] ?? "",
        layoverHours: legsToPrimaryLayover(legs),
      });
    } else {
      updateTrip(trip.id, {
        tripType: newType,
        legs: undefined,
        destinations: [],
        destination: newType === "LAYOVER" ? trip.destination : trip.destination,
        layoverHours: newType === "LAYOVER" ? trip.layoverHours : null,
      });
    }
  }

  function updateLeg(trip: QuickPostOfferedTripData, legIdx: number, patch: Partial<QuickPostLegEntry>) {
    const legs = [...(trip.legs ?? defaultLegs())];
    legs[legIdx] = { ...legs[legIdx]!, ...patch };
    const hasLayover = legsHaveAnyLayover(legs);
    const autoType: TripTypeKey = hasLayover ? "PAIRING_WITH_LAYOVER" : "MULTI_STOP";
    updateTrip(trip.id, {
      legs,
      tripType: autoType,
      destinations: legsToDestinations(legs),
      destination: legsToDestinations(legs)[0] ?? "",
      layoverHours: legsToPrimaryLayover(legs),
    });
  }

  function addLeg(trip: QuickPostOfferedTripData) {
    const legs = [...(trip.legs ?? defaultLegs())];
    if (legs.length >= MAX_LEG_STOPS) return;
    legs.push({ to: "", hasLayover: false, layoverHours: null });
    updateTrip(trip.id, {
      legs,
      destinations: legsToDestinations(legs),
      destination: legsToDestinations(legs)[0] ?? "",
    });
  }

  function removeLeg(trip: QuickPostOfferedTripData, legIdx: number) {
    const legs = [...(trip.legs ?? defaultLegs())];
    if (legs.length <= MIN_LEG_STOPS) return;
    legs.splice(legIdx, 1);
    const hasLayover = legsHaveAnyLayover(legs);
    const autoType: TripTypeKey = hasLayover ? "PAIRING_WITH_LAYOVER" : "MULTI_STOP";
    updateTrip(trip.id, {
      legs,
      tripType: autoType,
      destinations: legsToDestinations(legs),
      destination: legsToDestinations(legs)[0] ?? "",
      layoverHours: legsToPrimaryLayover(legs),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Quick Post</h2>
        <p className="text-sm text-slate-500">Offer up to {MAX_TRIPS_PER_POST} trips as one package.</p>
      </div>

      <section className="rounded-2xl border border-slate-200 border-s-4 border-s-[#2668B0] bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📤</span>
            <h3 className="text-base font-bold text-slate-900">WHAT I&apos;M OFFERING</h3>
          </div>
          <span className="text-xs text-slate-500">
            {offeredTrips.length} / {MAX_TRIPS_PER_POST} trips
          </span>
        </div>

        <div className="space-y-4">
          {offeredTrips.map((trip, index) => (
            <div key={trip.id ?? index} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Trip {index + 1}
                </span>
                {offeredTrips.length > MIN_TRIPS_PER_POST && (
                  <button
                    type="button"
                    onClick={() => removeTrip(trip.id)}
                    className="text-xs font-medium text-red-500 hover:text-red-700"
                  >
                    ✕ Remove
                  </button>
                )}
              </div>

              {/* Trip type buttons */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">Trip type</label>
                <div className="flex flex-wrap gap-2">
                  {tripTypeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleTripTypeChange(trip, opt.value)}
                      className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                        trip.tripType === opt.value
                          ? opt.activeClass
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {opt.value === "PAIRING_WITH_LAYOVER" && (
                        <Moon className="inline h-3 w-3 mr-1" />
                      )}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic leg builder for Pairing types */}
              {isPairingType(trip.tripType) ? (
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Route</label>
                  <div className="space-y-2">
                    {/* First leg header */}
                    <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
                      <span className="w-16 shrink-0">From</span>
                      <span className="flex-1">To</span>
                    </div>

                    {/* First leg: from=Your Base (read-only) */}
                    <div className="flex items-start gap-2">
                      <span className="mt-2 w-16 shrink-0 rounded bg-slate-200 px-2 py-1 text-center text-xs font-medium text-slate-500">
                        Your Base
                      </span>
                      <div className="flex-1 min-w-0">
                        <select
                          value={(trip.legs ?? defaultLegs())[0]?.to ?? ""}
                          onChange={(e) => updateLeg(trip, 0, { to: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
                        >
                          <option value="">Select stop 1</option>
                          {airports.map((a) => (
                            <option key={a.code} value={a.code}>
                              {a.code} – {a.city}
                            </option>
                          ))}
                        </select>
                        {/* Layover checkbox for first leg */}
                        <div className="mt-1.5 flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`leg-${trip.id}-0-layover`}
                            checked={(trip.legs ?? defaultLegs())[0]?.hasLayover ?? false}
                            onChange={(e) => updateLeg(trip, 0, { hasLayover: e.target.checked, layoverHours: e.target.checked ? ((trip.legs ?? defaultLegs())[0]?.layoverHours ?? null) : null })}
                            className="h-3.5 w-3.5 accent-purple-600"
                          />
                          <label htmlFor={`leg-${trip.id}-0-layover`} className="text-xs text-slate-600 flex items-center gap-1">
                            <Moon className="h-3 w-3" /> Layover here
                          </label>
                          {(trip.legs ?? defaultLegs())[0]?.hasLayover && (
                            <input
                              type="number"
                              min={1}
                              max={99}
                              placeholder="hrs *"
                              value={(trip.legs ?? defaultLegs())[0]?.layoverHours ?? ""}
                              onChange={(e) => updateLeg(trip, 0, { layoverHours: e.target.value ? Number(e.target.value) : null })}
                              className={`w-16 rounded border px-2 py-1 text-xs text-gray-900 placeholder:text-gray-400 bg-white ${
                                !(trip.legs ?? defaultLegs())[0]?.layoverHours ? "border-rose-300" : "border-slate-200"
                              }`}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle legs (index 1+) */}
                    {(trip.legs ?? defaultLegs()).slice(1).map((leg, relIdx) => {
                      const idx = relIdx + 1;
                      const fromCode = (trip.legs ?? defaultLegs())[idx - 1]?.to || "prev stop";
                      return (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="mt-2 w-16 shrink-0 rounded bg-slate-100 px-2 py-1 text-center text-xs font-medium text-slate-500 truncate">
                            {fromCode || "—"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 min-w-0">
                              <select
                                value={leg.to}
                                onChange={(e) => updateLeg(trip, idx, { to: e.target.value })}
                                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
                              >
                                <option value="">Select stop {idx + 1}</option>
                                {airports.map((a) => (
                                  <option key={a.code} value={a.code}>
                                    {a.code} – {a.city}
                                  </option>
                                ))}
                              </select>
                              {idx >= MIN_LEG_STOPS && (
                                <button
                                  type="button"
                                  onClick={() => removeLeg(trip, idx)}
                                  className="shrink-0 rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                                  aria-label="Remove stop"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            {/* Layover checkbox */}
                            <div className="mt-1.5 flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`leg-${trip.id}-${idx}-layover`}
                                checked={leg.hasLayover}
                                onChange={(e) => updateLeg(trip, idx, { hasLayover: e.target.checked, layoverHours: e.target.checked ? leg.layoverHours : null })}
                                className="h-3.5 w-3.5 accent-purple-600"
                              />
                              <label htmlFor={`leg-${trip.id}-${idx}-layover`} className="text-xs text-slate-600 flex items-center gap-1">
                                <Moon className="h-3 w-3" /> Layover here
                              </label>
                              {leg.hasLayover && (
                                <input
                                  type="number"
                                  min={1}
                                  max={99}
                                  placeholder="hrs *"
                                  value={leg.layoverHours ?? ""}
                                  onChange={(e) => updateLeg(trip, idx, { layoverHours: e.target.value ? Number(e.target.value) : null })}
                                  className={`w-16 rounded border px-2 py-1 text-xs text-gray-900 placeholder:text-gray-400 bg-white ${
                                    !leg.layoverHours ? "border-rose-300" : "border-slate-200"
                                  }`}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Last leg: to=Your Base (read-only) */}
                    <div className="flex items-center gap-2 text-xs text-slate-400 px-1 pt-1">
                      <span className="w-16 shrink-0 rounded bg-slate-100 px-2 py-1 text-center font-medium text-slate-500 truncate">
                        {(trip.legs ?? defaultLegs())[(trip.legs ?? defaultLegs()).length - 1]?.to || "last stop"}
                      </span>
                      <span className="flex-1 rounded bg-slate-200 px-2 py-1 text-center text-xs font-medium text-slate-500">
                        Your Base (return)
                      </span>
                    </div>
                  </div>

                  {/* Add stop button */}
                  {(trip.legs ?? defaultLegs()).length < MAX_LEG_STOPS && (
                    <button
                      type="button"
                      onClick={() => addLeg(trip)}
                      className="mt-2 text-sm text-[#2668B0] hover:underline"
                    >
                      + Add stop
                    </button>
                  )}

                  {/* Auto-type indicator */}
                  {trip.tripType === "PAIRING_WITH_LAYOVER" && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-purple-600">
                      <Moon className="h-3 w-3" />
                      Pairing with Layover — overnight stay included
                    </p>
                  )}
                </div>
              ) : trip.tripType === "LAYOVER" ? (
                /* Layover: single destination + hours */
                <div className="mb-4 space-y-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Layover city</label>
                    <select
                      value={trip.destination ?? ""}
                      onChange={(e) => updateTrip(trip.id, { destination: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
                    >
                      <option value="">Select layover city</option>
                      {internationalAirports.map((airport) => (
                        <option key={airport.code} value={airport.code}>
                          {airport.code} - {airport.city}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">Select the city where you spend the night.</p>
                  </div>
                </div>
              ) : (
                /* Round Trip: single destination */
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Destination</label>
                  <select
                    value={trip.destination ?? ""}
                    onChange={(e) => updateTrip(trip.id, { destination: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
                  >
                    <option value="">Select destination</option>
                    {internationalAirports.map((airport) => (
                      <option key={airport.code} value={airport.code}>
                        {airport.code} - {airport.city}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date + report time + layover hours */}
              <div
                className={`mb-4 grid gap-3 ${
                  trip.tripType === "LAYOVER" ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"
                }`}
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Date</label>
                  <input
                    type="date"
                    value={trip.date}
                    onChange={(e) => updateTrip(trip.id, { date: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Report time <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    value={normalizeTimeValue(trip.reportTime ?? "")}
                    onChange={(e) => updateTrip(trip.id, { reportTime: sanitizeTimeInput(e.target.value) })}
                    placeholder="20:15"
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 bg-white ${
                      trip.reportTime && !isValidTimeValue(trip.reportTime)
                        ? "border-rose-400 bg-rose-50"
                        : !trip.reportTime
                        ? "border-rose-300"
                        : "border-slate-200"
                    }`}
                  />
                  <p className="mt-1 text-xs text-slate-500">24-hour format HH:MM</p>
                </div>
                {trip.tripType === "LAYOVER" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Layover hours <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={trip.layoverHours ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
                        updateTrip(trip.id, { layoverHours: raw ? Number(raw) : null });
                      }}
                      placeholder="e.g. 32"
                      className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 bg-white ${
                        !trip.layoverHours ? "border-rose-300" : "border-slate-200"
                      }`}
                    />
                  </div>
                )}
              </div>

              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium text-[#2668B0]">
                  More details (optional)
                </summary>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Aircraft type</label>
                    <input
                      type="text"
                      value={trip.aircraftTypeCode ?? ""}
                      onChange={(e) => updateTrip(trip.id, { aircraftTypeCode: e.target.value })}
                      placeholder="32N"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Block hours</label>
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      value={trip.blockHours ?? ""}
                      onChange={(e) => updateTrip(trip.id, { blockHours: e.target.value ? Number(e.target.value) : null })}
                      placeholder="9.5"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Flight number</label>
                    <div className="flex items-center gap-1.5">
                      <span className="shrink-0 text-sm font-medium text-slate-500">SV</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={trip.flightNumber ?? ""}
                        onChange={(e) => updateTrip(trip.id, { flightNumber: normalizeFlightNumberInput(e.target.value) })}
                        placeholder="738"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Optional — digits only</p>
                  </div>
                </div>
              </details>
            </div>
          ))}
        </div>

        {canAddMore ? (
          <button
            type="button"
            onClick={addTrip}
            className="mt-4 w-full rounded-xl border-2 border-dashed border-slate-300 py-2.5 text-sm text-slate-500 hover:border-[#2668B0] hover:text-[#2668B0]"
          >
            + Add another trip
          </button>
        ) : (
          <div className="mt-4 w-full rounded-xl border-2 border-dashed border-slate-200 py-2.5 text-center text-sm text-gray-500">
            Maximum {MAX_TRIPS_PER_POST} trips per post
          </div>
        )}

        <div className="mt-3 text-center text-xs text-slate-500">
          {offeredTrips.length} trip{offeredTrips.length > 1 ? "s" : ""}
          {totalBlockHours > 0 ? ` · Total block: ${formatHours(totalBlockHours)}` : ""}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 border-s-4 border-s-[#3BA34A] bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <span className="text-xl">📥</span>
          <h3 className="text-base font-bold text-slate-900">WHAT I WANT IN RETURN</h3>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">Return trip type</label>
          <div className="flex flex-wrap gap-2">
            {returnTripTypeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const next: WantCriteriaData = { ...wantCriteria, wantType: opt.value };
                  if (opt.value === "DAYS_OFF") {
                    next.wantOpenToAnyDestination = false;
                    next.wantDestinations = [];
                  }
                  onWantCriteriaChange(next);
                }}
                className={`rounded-lg border-2 px-3 py-2 text-sm ${
                  wantCriteria.wantType === opt.value
                    ? "border-[#3BA34A] bg-[#E8F5EA] text-[#3BA34A]"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {wantCriteria.wantType !== "DAYS_OFF" ? (
          <>
            <div className="mb-4">
              <WantDestinationsField
                label="Want destinations"
                description="Pick specific airports or Anything."
                required
                wantOpenToAnyDestination={openAny}
                wantDestinations={wantCriteria.wantDestinations}
                onChange={({ wantOpenToAnyDestination, wantDestinations }) =>
                  onWantCriteriaChange({ ...wantCriteria, wantOpenToAnyDestination, wantDestinations })
                }
              />
              {!openAny && wantCriteria.wantDestinations.length === 0 && (
                <p className="mt-1 text-xs text-rose-600">Choose at least one destination or Anything.</p>
              )}
              {(wantCriteria.wantType === "LAYOVER" || wantCriteria.wantType === "LONGER_LAYOVER") && (
                <p className="mt-1 text-xs text-slate-500">
                  Leave cities blank to accept any layover destination, or add specific cities you prefer.
                </p>
              )}
            </div>

            <div className="mb-4">
              <ExcludeDestinationsField
                label="Exclude destinations (optional)"
                wantExclude={wantCriteria.wantExclude}
                onChange={(wantExclude) => onWantCriteriaChange({ ...wantCriteria, wantExclude })}
              />
            </div>
          </>
        ) : (
          <div className="mb-4 rounded-lg border border-slate-200 p-3">
            <WtfDayPicker
              label={
                <>
                  Days off I want <span className="text-rose-600">*</span>
                </>
              }
              selectedDays={selectedDaysOff}
              scheduledDays={[]}
              month={month}
              year={year}
              minSelectableDay={1}
              onChange={onSelectedDaysOffChange}
            />
          </div>
        )}

        <div className="mb-4 rounded-lg border border-slate-200 p-3">
          <WtfDayPicker
            label={
              <>
                I am willing to fly on <span className="text-rose-600">*</span>
              </>
            }
            selectedDays={wantCriteria.wtfDays}
            scheduledDays={scheduledDays}
            month={month}
            year={year}
            onChange={(days) => onWantCriteriaChange({ ...wantCriteria, wtfDays: days })}
          />
          {wantCriteria.wtfDays.length === 0 && (
            <p className="mt-1 text-xs text-rose-600">Choose at least one day you are willing to fly.</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Notes (optional)</label>
          <textarea
            value={wantCriteria.notes}
            onChange={(e) => onWantCriteriaChange({ ...wantCriteria, notes: e.target.value })}
            placeholder="Any extra note..."
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>
      </section>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="text-sm text-slate-500 hover:underline">
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="rounded-lg bg-[#2668B0] px-6 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Preview →
        </button>
      </div>
    </div>
  );
}
