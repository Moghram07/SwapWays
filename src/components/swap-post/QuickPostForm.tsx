"use client";

import { useMemo } from "react";
import { getAllAirports } from "@/utils/airportNames";
import type { QuickPostOfferedTripData, WantCriteriaData } from "@/types/swapPost";
import { DesiredDestinations } from "@/components/swap/DesiredDestinations";
import { WtfDayPicker } from "@/components/swap/WtfDayPicker";
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

const tripTypeOptions: Array<{ value: QuickPostOfferedTripData["tripType"]; label: string }> = [
  { value: "LAYOVER", label: "Layover" },
  { value: "TURNAROUND", label: "Round trip" },
  { value: "MULTI_STOP", label: "Multi-stop" },
];

const wantTypeOptions: Array<{ value: WantCriteriaData["wantType"]; label: string }> = [
  { value: "LAYOVER", label: "Layover" },
  { value: "ROUND_TRIP", label: "Round trip" },
  { value: "ANYTHING", label: "Anything" },
  { value: "DAYS_OFF", label: "Days off" },
];

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

  const canProceed =
    offeredTrips.length >= MIN_TRIPS_PER_POST &&
    offeredTrips.every((trip) => {
      if (!trip.date) return false;
      if (trip.tripType === "MULTI_STOP") {
        return trip.destinations.filter(Boolean).length >= 2;
      }
      if (!trip.destination) return false;
      if (trip.tripType === "LAYOVER") {
        return (trip.layoverHours ?? 0) > 0;
      }
      return true;
    }) &&
    (wantCriteria.wantType !== "DAYS_OFF" ||
      (selectedDaysOff.length > 0 && wantCriteria.wtfDays.length > 0));

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Quick Post</h2>
        <p className="text-sm text-slate-500">Offer up to {MAX_TRIPS_PER_POST} trips as one package.</p>
      </div>

      <section className="rounded-2xl border border-slate-200 border-l-4 border-l-[#2668B0] bg-white p-6 shadow-sm">
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

              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">Trip type</label>
                <div className="flex flex-wrap gap-2">
                  {tripTypeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        updateTrip(trip.id, {
                          tripType: opt.value,
                          destinations: opt.value === "MULTI_STOP" ? (trip.destinations.length > 0 ? trip.destinations : [""]) : [],
                          destination: opt.value === "MULTI_STOP" ? "" : trip.destination,
                          layoverHours: opt.value === "LAYOVER" ? trip.layoverHours : null,
                        })
                      }
                      className={`rounded-lg border-2 px-4 py-2 text-sm font-medium ${
                        trip.tripType === opt.value
                          ? "border-[#2668B0] bg-[#E3EFF9] text-[#2668B0]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {trip.tripType === "MULTI_STOP" ? (
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Destinations (in order)</label>
                  <div className="space-y-2">
                    {trip.destinations.map((dest, idx) => (
                      <div key={`${trip.id ?? index}-stop-${idx}`} className="flex items-center gap-2">
                        <span className="w-8 text-center text-xs text-gray-500">#{idx + 1}</span>
                        <select
                          value={dest}
                          onChange={(e) => {
                            const next = [...trip.destinations];
                            next[idx] = e.target.value;
                            updateTrip(trip.id, { destinations: next });
                          }}
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
                        >
                          <option value="">Select airport</option>
                          {airports.map((airport) => (
                            <option key={airport.code} value={airport.code}>
                              {airport.code} - {airport.city}
                            </option>
                          ))}
                        </select>
                        {trip.destinations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              updateTrip(trip.id, {
                                destinations: trip.destinations.filter((_, i) => i !== idx),
                              });
                            }}
                            className="px-2 text-sm text-red-400 hover:text-red-600"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => updateTrip(trip.id, { destinations: [...trip.destinations, ""] })}
                    className="mt-2 text-sm text-[#2668B0] hover:underline"
                  >
                    + Add stop
                  </button>
                  <p className="mt-1 text-xs text-gray-500">e.g. JED → MED → JED → EAM → JED</p>
                </div>
              ) : (
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

              <div className={`mb-4 grid gap-3 ${trip.tripType === "LAYOVER" ? "grid-cols-2" : "grid-cols-1"}`}>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Date</label>
                  <input
                    type="date"
                    value={trip.date}
                    onChange={(e) => updateTrip(trip.id, { date: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                {trip.tripType === "LAYOVER" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Layover duration (hours)</label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={trip.layoverHours ?? ""}
                      onChange={(e) => updateTrip(trip.id, { layoverHours: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 32"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
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
                    <label className="mb-1 block text-xs text-slate-500">Report time</label>
                    <input
                      type="text"
                      value={trip.reportTime ?? ""}
                      onChange={(e) => updateTrip(trip.id, { reportTime: e.target.value })}
                      placeholder="08.30Z"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
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
                    <input
                      type="text"
                      value={trip.flightNumber ?? ""}
                      onChange={(e) => updateTrip(trip.id, { flightNumber: e.target.value })}
                      placeholder="SV0227"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
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

      <section className="rounded-2xl border border-slate-200 border-l-4 border-l-[#3BA34A] bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <span className="text-xl">📥</span>
          <h3 className="text-base font-bold text-slate-900">WHAT I WANT IN RETURN</h3>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">Want type</label>
          <div className="flex flex-wrap gap-2">
            {wantTypeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onWantCriteriaChange({ ...wantCriteria, wantType: opt.value })}
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Want destinations (optional)</label>
              <DesiredDestinations
                selected={wantCriteria.wantDestinations}
                onChange={(d) => onWantCriteriaChange({ ...wantCriteria, wantDestinations: d })}
                hideLabel
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Exclude destinations (optional)</label>
              <DesiredDestinations
                selected={wantCriteria.wantExclude}
                onChange={(d) => onWantCriteriaChange({ ...wantCriteria, wantExclude: d })}
                hideLabel
              />
            </div>
          </>
        ) : (
          <div className="mb-4 rounded-lg border border-slate-200 p-3">
            <WtfDayPicker
              label="Days off I want (required)"
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
              wantCriteria.wantType === "DAYS_OFF"
                ? "I am willing to fly on (required)"
                : "WTF days (optional)"
            }
            selectedDays={wantCriteria.wtfDays}
            scheduledDays={scheduledDays}
            month={month}
            year={year}
            onChange={(days) => onWantCriteriaChange({ ...wantCriteria, wtfDays: days })}
          />
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
