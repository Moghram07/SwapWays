"use client";

import { useMemo } from "react";
import { Moon, Lock, Plane } from "lucide-react";
import { buildTripRouteChainNodes } from "@/utils/multiStopRouteDisplay";
import { RouteChain } from "@/components/RouteChain";
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
  const legDeadheads = legs.map((l) => l.isDeadhead ?? false);
  return { tripType: classified.type, destination, destinations, layoverHours, legDeadheads };
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

function isLockedReturnLeg(legIdx: number, legs: QuickPostLegEntry[], baseCode: string): boolean {
  if (!baseCode) return false;
  return legIdx === legs.length - 1 && legs[legIdx]?.to.trim().toUpperCase() === baseCode.toUpperCase();
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

  const missingItems: string[] = [];
  if (offeredTrips.length < MIN_TRIPS_PER_POST)
    missingItems.push(`Offer at least ${MIN_TRIPS_PER_POST} trips`);
  offeredTrips.forEach((trip, i) => {
    const label = offeredTrips.length > 1 ? `Trip ${i + 1}: ` : "";
    if (!trip.date) missingItems.push(`${label}Date required`);
    if (!isValidTimeValue(trip.reportTime ?? "")) missingItems.push(`${label}Valid report time required`);
    const legs = trip.legs;
    if (legs.length < MIN_LEGS) missingItems.push(`${label}At least ${MIN_LEGS} legs required`);
    if (legs.some((l) => !l.to.trim())) missingItems.push(`${label}All legs need a destination`);
    if (userBaseCode && legs[legs.length - 1]?.to.trim().toUpperCase() !== userBaseCode.toUpperCase())
      missingItems.push(`${label}Last leg must return to ${userBaseCode}`);
    if (legs.some((l) => l.hasLayover && !((l.layoverHours ?? 0) > 0)))
      missingItems.push(`${label}Layover legs need hours`);
  });
  if (!wantsOk)
    missingItems.push(wantCriteria.wantType === "DAYS_OFF" ? "Select days off wanted" : "Choose at least one destination or Anything");
  if (!wtfOk)
    missingItems.push("Choose at least one day you're willing to fly");

  const canProceed = missingItems.length === 0;

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
    // Always append at the end. The previous last leg (a base return or any stop) stays put and
    // becomes an editable intermediate waypoint — this lets the user route through base, e.g.
    // JED → ABT → JED → BHH → JED. The "+ Return to {base}" helper + validation re-close the loop.
    const newLeg: QuickPostLegEntry = { to: "", hasLayover: false, layoverHours: null };
    const legs = [...trip.legs, newLeg];
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
        <h2 className="text-lg font-semibold text-content">Quick Post</h2>
        <p className="text-sm text-muted">Offer up to {MAX_TRIPS_PER_POST} trips as one package.</p>
      </div>

      <section className="rounded-2xl border border-line border-s-4 border-s-[#2668B0] bg-surface p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📤</span>
            <h3 className="text-base font-bold text-content">WHAT I&apos;M OFFERING</h3>
          </div>
          <span className="text-xs text-muted">
            {offeredTrips.length} / {MAX_TRIPS_PER_POST} trips
          </span>
        </div>

        <div className="space-y-4">
          {offeredTrips.map((trip, index) => {
            const legs = trip.legs;
            const classified = classifyQuickLegs(legs);

            const badgeClass =
              classified.type === "TURNAROUND"
                ? "bg-brand-blue-soft text-[#2668B0]"
                : classified.type === "MULTI_STOP"
                ? "bg-amber-50 text-amber-700"
                : "bg-brand-green-soft text-[#3BA34A]";

            return (
              <div key={trip.id ?? index} className="rounded-xl border border-line bg-surface-2 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
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
                  <p className="mb-3 text-xs text-muted">
                    Add each leg of your trip. Check &ldquo;Layover here&rdquo; on any stop where you have a layover. We&apos;ll determine the trip type automatically.
                  </p>

                  <div className="space-y-2">
                    {legs.map((leg, legIdx) => {
                      const fromCode =
                        legIdx === 0 ? (userBaseCode || "Base") : (legs[legIdx - 1]?.to || "—");
                      const isLast = legIdx === legs.length - 1;
                      const locked = isLockedReturnLeg(legIdx, legs, userBaseCode);
                      const lastLegWrong =
                        isLast &&
                        !locked &&
                        !!userBaseCode &&
                        !!leg.to &&
                        leg.to.trim().toUpperCase() !== userBaseCode.toUpperCase();
                      const filteredAirports = airports.filter(
                        (a) => !fromCode || a.code.toUpperCase() !== fromCode.toUpperCase()
                      );

                      return (
                        <div key={legIdx} className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-14 shrink-0 rounded bg-surface-2 px-2 py-1.5 text-center text-xs font-semibold text-muted truncate">
                              {fromCode}
                            </span>
                            <span className="text-faint text-xs shrink-0">→</span>
                            <div className="flex-1 min-w-0">
                              {locked ? (
                                <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 py-2">
                                  <Lock className="h-3 w-3 shrink-0 text-faint" />
                                  <span className="text-sm font-medium text-content-soft">{leg.to}</span>
                                  <span className="ml-auto text-xs text-faint">Base</span>
                                </div>
                              ) : (
                                <AirportSearchInput
                                  airports={filteredAirports}
                                  value={leg.to}
                                  onChange={(code) => updateLeg(trip, legIdx, { to: code })}
                                  placeholder={
                                    isLast ? `Return to ${userBaseCode || "base"}` : `Stop ${legIdx + 1}`
                                  }
                                />
                              )}
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
                            <div className="pl-[4.25rem]">
                              <div className="flex items-center gap-2">
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
                                  className="flex cursor-pointer items-center gap-1 text-xs text-muted"
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
                                    className={`w-16 rounded border px-2 py-1 text-xs text-content placeholder:text-faint bg-surface ${
                                      !leg.layoverHours ? "border-rose-300" : "border-line"
                                    }`}
                                  />
                                )}
                              </div>
                              {leg.hasLayover && !((leg.layoverHours ?? 0) > 0) && (
                                <p className="mt-0.5 text-xs text-rose-500">Enter layover hours</p>
                              )}
                            </div>
                          )}

                          {/* Dead head checkbox — all legs */}
                          <div className="pl-[4.25rem]">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`leg-${trip.id}-${legIdx}-dh`}
                                checked={leg.isDeadhead ?? false}
                                onChange={(e) =>
                                  updateLeg(trip, legIdx, { isDeadhead: e.target.checked })
                                }
                                className="h-3.5 w-3.5 accent-purple-600"
                              />
                              <label
                                htmlFor={`leg-${trip.id}-${legIdx}-dh`}
                                className="flex cursor-pointer items-center gap-1 text-xs text-muted"
                              >
                                <Plane className="h-3 w-3 text-purple-500" />
                                Dead head (no duty)
                              </label>
                            </div>
                          </div>

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
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => addLeg(trip)}
                          disabled={legs.some((l) => !l.to.trim())}
                          className="text-sm text-[#2668B0] hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          + Add leg
                        </button>
                        {userBaseCode && legs[legs.length - 1]?.to.trim().toUpperCase() !== userBaseCode.toUpperCase() && (
                          <button
                            type="button"
                            onClick={() => updateLeg(trip, legs.length - 1, { to: userBaseCode })}
                            className="text-sm text-[#3BA34A] hover:underline"
                          >
                            + Return to {userBaseCode}
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-faint">Maximum {MAX_LEGS} legs</span>
                    )}

                    {/* Live classification badge */}
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass}`}>
                      {classified.label}
                    </span>
                  </div>
                </div>

                {/* Live route chain preview */}
                {(() => {
                  const interimLegs = legs.slice(0, -1);
                  const filledCount = legs.filter((l) => l.to.trim()).length;
                  if (filledCount < 2) return null;
                  const firstLayoverLeg = interimLegs.find((l) => l.hasLayover && (l.layoverHours ?? 0) > 0);
                  const legLayovers = interimLegs
                    .map((l, i) =>
                      l.hasLayover && l.layoverHours ? { legIndex: i, layoverHours: l.layoverHours } : null
                    )
                    .filter((x): x is { legIndex: number; layoverHours: number } => x !== null);
                  const nodes = buildTripRouteChainNodes({
                    destination: firstLayoverLeg?.to ?? interimLegs[0]?.to ?? "",
                    destinations: interimLegs.map((l) => l.to).filter(Boolean),
                    baseCode: userBaseCode || undefined,
                    layoverCity: firstLayoverLeg?.to ?? null,
                    layoverHours: firstLayoverLeg?.layoverHours ?? null,
                    legLayovers,
                  });
                  if (nodes.length < 2) return null;
                  return (
                    <div className="mb-4 rounded-lg border border-line bg-surface p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">Route preview</p>
                      <RouteChain nodes={nodes} tripType={classified.type} />
                      <p className="mt-1.5 text-xs font-medium text-[#2668B0]">{classified.label}</p>
                    </div>
                  );
                })()}

                {/* Date + report time */}
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-content-soft">Date</label>
                    <input
                      type="date"
                      value={trip.date}
                      onChange={(e) => updateTrip(trip.id, { date: e.target.value })}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-content"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-content-soft">
                      Report time <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={normalizeTimeValue(trip.reportTime ?? "")}
                      onChange={(e) => updateTrip(trip.id, { reportTime: sanitizeTimeInput(e.target.value) })}
                      placeholder="20:15"
                      className={`w-full rounded-lg border px-3 py-2 text-sm text-content placeholder:text-faint bg-surface ${
                        trip.reportTime && !isValidTimeValue(trip.reportTime)
                          ? "border-rose-400 bg-rose-50"
                          : !trip.reportTime
                          ? "border-rose-300"
                          : "border-line"
                      }`}
                    />
                    <p className="mt-1 text-xs text-muted">24-hour format HH:MM · Local time</p>
                  </div>
                </div>

                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-[#2668B0]">
                    More details (optional)
                  </summary>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-muted">Aircraft type</label>
                      <input
                        type="text"
                        value={trip.aircraftTypeCode ?? ""}
                        onChange={(e) => updateTrip(trip.id, { aircraftTypeCode: e.target.value })}
                        placeholder="32N"
                        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-content placeholder:text-faint"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted">Block hours</label>
                      <input
                        type="number"
                        step={0.1}
                        min={0}
                        value={trip.blockHours ?? ""}
                        onChange={(e) =>
                          updateTrip(trip.id, { blockHours: e.target.value ? Number(e.target.value) : null })
                        }
                        placeholder="9.5"
                        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-content placeholder:text-faint"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted">Flight number</label>
                      <div className="flex items-center gap-1.5">
                        <span className="shrink-0 text-sm font-medium text-muted">SV</span>
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
                          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-content"
                        />
                      </div>
                      <p className="mt-1 text-xs text-faint">Optional — digits only</p>
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
            className="mt-4 w-full rounded-xl border-2 border-dashed border-line py-2.5 text-sm text-muted hover:border-[#2668B0] hover:text-[#2668B0]"
          >
            + Add another trip
          </button>
        ) : (
          <div className="mt-4 w-full rounded-xl border-2 border-dashed border-line py-2.5 text-center text-sm text-muted">
            Maximum {MAX_TRIPS_PER_POST} trips per post
          </div>
        )}

        <div className="mt-3 text-center text-xs text-muted">
          {offeredTrips.length} trip{offeredTrips.length > 1 ? "s" : ""}
          {totalBlockHours > 0 ? ` · Total block: ${formatHours(totalBlockHours)}` : ""}
        </div>
      </section>

      <section className="rounded-2xl border border-line border-s-4 border-s-[#3BA34A] bg-surface p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <span className="text-xl">📥</span>
          <h3 className="text-base font-bold text-content">WHAT I WANT IN RETURN</h3>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-content-soft">What do you want back?</label>
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
                    ? "border-[#3BA34A] bg-brand-green-soft text-[#3BA34A]"
                    : "border-line text-muted"
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
                label="Where?"
                required
                wantOpenToAnyDestination={openAny}
                wantDestinations={wantCriteria.wantDestinations}
                onChange={({ wantOpenToAnyDestination, wantDestinations }) =>
                  onWantCriteriaChange({ ...wantCriteria, wantOpenToAnyDestination, wantDestinations })
                }
              />
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
          <div className="mb-4 rounded-lg border border-line p-3">
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

        <div className="mb-4 rounded-lg border border-line p-3">
          <WtfDayPicker
            label={
              <>
                Willing to fly <span className="text-rose-600">*</span>
              </>
            }
            selectedDays={wantCriteria.wtfDays}
            scheduledDays={scheduledDays}
            month={month}
            year={year}
            onChange={(days) => onWantCriteriaChange({ ...wantCriteria, wtfDays: days })}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-content-soft">Notes (optional)</label>
          <textarea
            value={wantCriteria.notes}
            onChange={(e) => onWantCriteriaChange({ ...wantCriteria, notes: e.target.value })}
            placeholder="Any extra note..."
            rows={3}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-content placeholder:text-faint"
          />
        </div>
      </section>

      {missingItems.length > 0 && (
        <ul className="rounded-lg bg-surface-2 px-3 py-2.5 space-y-1">
          {missingItems.map((item) => (
            <li key={item} className="flex items-center gap-1.5 text-xs text-muted">
              <span className="text-rose-400">·</span>
              {item}
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="rounded-lg border border-slate-800 bg-surface px-4 py-2 text-sm font-medium text-content hover:bg-surface-2">
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
