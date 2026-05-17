"use client";

import { useMemo } from "react";
import { Moon } from "lucide-react";
import { getAllAirports } from "@/utils/airportNames";
import { normalizeFlightNumberInput } from "@/utils/flightNumber";
import { classifyQuickLegs } from "@/utils/tripClassifier";
import type { QuickPostOfferedTripData, QuickPostLegEntry, WantCriteriaData } from "@/types/swapPost";
import { WtfDayPicker } from "@/components/swap/WtfDayPicker";
import { WantDestinationsField, ExcludeDestinationsField } from "@/components/swap/WantDestinationsField";
import { AirportSearchInput } from "@/components/swap/AirportSearchInput";
import { MAX_TRIPS_PER_POST, MIN_TRIPS_PER_POST } from "@/constants/swapPost";

interface QuickPostFormProps {
  offeredTrips: QuickPostOfferedTripData[];
  wantCriteria: WantCriteriaData;
  selectedDaysOff: number[];
  month: number;
  year: number;
  scheduledDays: number[];
  userBaseCode: string;
  onOfferedTripsChange: (value: QuickPostOfferedTripData[]) => void;
  onWantCriteriaChange: (value: WantCriteriaData) => void;
  onSelectedDaysOffChange: (value: number[]) => void;
  onBack: () => void;
  onNext: () => void;
}

const MIN_LEGS = 2;
const MAX_LEGS = 8;

const returnTripTypeOptions: Array<{ value: WantCriteriaData["wantType"]; label: string }> = [
  { value: "LAYOVER",    label: "Layover" },
  { value: "ROUND_TRIP", label: "Round trip" },
  { value: "ANY_FLIGHT", label: "Any flight" },
  { value: "DAYS_OFF",   label: "Days off" },
];

function defaultLegs(): QuickPostLegEntry[] {
  return [
    { to: "", hasLayover: false, layoverHours: null },
    { to: "", hasLayover: false, layoverHours: null },
  ];
}

function legsToApiFields(legs: QuickPostLegEntry[]) {
  const classified = classifyQuickLegs(legs);
  const interimLegs = legs.slice(0, -1); // exclude final return leg
  const destinations = interimLegs.map((l) => l.to).filter(Boolean);
  const firstLayover = interimLegs.find((l) => l.hasLayover && (l.layoverHours ?? 0) > 0);
  const destination =
    classified.type === "LAYOVER"
      ? (firstLayover?.to ?? destinations[0] ?? "")
      : (destinations[0] ?? "");
  const layoverHours = firstLayover?.layoverHours ?? null;
  return { tripType: classified.type, destination, destinations, layoverHours };
}

function createEmptyTrip(): QuickPostOfferedTripData {
  const legs = defaultLegs();
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    tripType: "TURNAROUND",
    destination: "",
    destinations: [],
    date: "",
    layoverHours: null,
    reportTime: "",
    aircraftTypeCode: "",
    blockHours: null,
    flightNumber: "",
    legs,
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

export function QuickPostForm({
  offeredTrips,
  wantCriteria,
  selectedDaysOff,
  month,
  year,
  scheduledDays,
  userBaseCode,
  onOfferedTripsChange,
  onWantCriteriaChange,
  onSelectedDaysOffChange,
  onBack,
  onNext,
}: QuickPostFormProps) {
  const airports = useMemo(() => getAllAirports(), []);
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
      const legs = trip.legs;
      if (legs.length < MIN_LEGS || legs.length > MAX_LEGS) return false;
      if (!legs.every((l) => l.to.trim())) return false;
      if (userBaseCode && legs[legs.length - 1]?.to.trim().toUpperCase() !== userBaseCode.toUpperCase()) return false;
      if (legs.some((l) => l.hasLayover && !((l.layoverHours ?? 0) > 0))) return false;
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

  function updateLeg(trip: QuickPostOfferedTripData, legIdx: number, patch: Partial<QuickPostLegEntry>) {
    const legs = [...trip.legs];
    legs[legIdx] = { ...legs[legIdx]!, ...patch };
    updateTrip(trip.id, { legs, ...legsToApiFields(legs) });
  }

  function addLeg(trip: QuickPostOfferedTripData) {
    if (trip.legs.length >= MAX_LEGS) return;
    const legs = [...trip.legs, { to: "", hasLayover: false, layoverHours: null }];
    updateTrip(trip.id, { legs, ...legsToApiFields(legs) });
  }

  function removeLeg(trip: QuickPostOfferedTripData) {
    if (trip.legs.length <= MIN_LEGS) return;
    const legs = trip.legs.slice(0, -1);
    updateTrip(trip.id, { legs, ...legsToApiFields(legs) });
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
          {offeredTrips.map((trip, index) => {
            const legs = trip.legs;
            const classified = classifyQuickLegs(legs);

            const badgeClass =
              classified.type === "TURNAROUND"
                ? "bg-[#E3EFF9] text-[#2668B0]"
                : classified.type === "MULTI_STOP"
                ? "bg-amber-50 text-amber-700"
                : "bg-[#E8F5EA] text-[#3BA34A]";

            return (
              <div key={trip.id ?? index} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
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

                {/* Universal leg builder */}
                <div className="mb-4">
                  <p className="mb-3 text-xs text-slate-500">
                    Add each leg of your trip. Check &ldquo;Layover here&rdquo; on any stop where you have a layover. We&apos;ll determine the trip type automatically.
                  </p>

                  <div className="space-y-2">
                    {legs.map((leg, legIdx) => {
                      const fromCode =
                        legIdx === 0 ? (userBaseCode || "Base") : (legs[legIdx - 1]?.to || "—");
                      const isLast = legIdx === legs.length - 1;
                      const lastLegWrong =
                        isLast &&
                        !!userBaseCode &&
                        !!leg.to &&
                        leg.to.trim().toUpperCase() !== userBaseCode.toUpperCase();

                      return (
                        <div key={legIdx} className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-14 shrink-0 rounded bg-slate-200 px-2 py-1.5 text-center text-xs font-semibold text-slate-600 truncate">
                              {fromCode}
                            </span>
                            <span className="text-slate-400 text-xs shrink-0">→</span>
                            <div className="flex-1 min-w-0">
                              <AirportSearchInput
                                airports={airports}
                                value={leg.to}
                                onChange={(code) => updateLeg(trip, legIdx, { to: code })}
                                placeholder={
                                  isLast ? `Return to ${userBaseCode || "base"}` : `Stop ${legIdx + 1}`
                                }
                              />
                            </div>
                            {isLast && legs.length > MIN_LEGS && (
                              <button
                                type="button"
                                onClick={() => removeLeg(trip)}
                                className="shrink-0 rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                                aria-label="Remove last leg"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {/* Layover checkbox — only on non-final legs */}
                          {!isLast && (
                            <div className="flex items-center gap-2 pl-[4.25rem]">
                              <input
                                type="checkbox"
                                id={`leg-${trip.id}-${legIdx}-layover`}
                                checked={leg.hasLayover}
                                onChange={(e) =>
                                  updateLeg(trip, legIdx, {
                                    hasLayover: e.target.checked,
                                    layoverHours: e.target.checked ? (leg.layoverHours ?? null) : null,
                                  })
                                }
                                className="h-3.5 w-3.5 accent-[#3BA34A]"
                              />
                              <label
                                htmlFor={`leg-${trip.id}-${legIdx}-layover`}
                                className="flex cursor-pointer items-center gap-1 text-xs text-slate-600"
                              >
                                <Moon className="h-3 w-3" />
                                Layover here
                              </label>
                              {leg.hasLayover && (
                                <input
                                  type="number"
                                  min={1}
                                  max={99}
                                  placeholder="hrs *"
                                  value={leg.layoverHours ?? ""}
                                  onChange={(e) =>
                                    updateLeg(trip, legIdx, {
                                      layoverHours: e.target.value ? Number(e.target.value) : null,
                                    })
                                  }
                                  className={`w-16 rounded border px-2 py-1 text-xs text-gray-900 placeholder:text-gray-400 bg-white ${
                                    !leg.layoverHours ? "border-rose-300" : "border-slate-200"
                                  }`}
                                />
                              )}
                            </div>
                          )}

                          {lastLegWrong && (
                            <p className="pl-[4.25rem] text-xs text-rose-600">
                              Last leg must return to {userBaseCode}.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    {legs.length < MAX_LEGS ? (
                      <button
                        type="button"
                        onClick={() => addLeg(trip)}
                        className="text-sm text-[#2668B0] hover:underline"
                      >
                        + Add leg
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Maximum {MAX_LEGS} legs</span>
                    )}

                    {/* Live classification badge */}
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass}`}>
                      {classified.label}
                    </span>
                  </div>
                </div>

                {/* Date + report time */}
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                        onChange={(e) =>
                          updateTrip(trip.id, { blockHours: e.target.value ? Number(e.target.value) : null })
                        }
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
                          onChange={(e) =>
                            updateTrip(trip.id, { flightNumber: normalizeFlightNumberInput(e.target.value) })
                          }
                          placeholder="738"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">Optional — digits only</p>
                    </div>
                  </div>
                </details>
              </div>
            );
          })}
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
