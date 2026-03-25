"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LineType } from "@/types/enums";
import { getAllAirports } from "@/utils/airportNames";

type LayoverEntry = { destination: string; hours: number };

const monthOptions = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const lineTypeOptions: Array<{ value: LineType; label: string }> = [
  { value: "NORMAL", label: "Normal" },
  { value: "US_LINE", label: "US Line" },
  { value: "CHINA_LINE", label: "China Line" },
  { value: "RESERVE_LINE", label: "Reserve" },
];
const wantLineTypeOptions: Array<{ value: "" | LineType; label: string }> = [
  { value: "", label: "Any" },
  ...lineTypeOptions,
];

export function LineSwapForm() {
  const router = useRouter();
  const airports = getAllAirports().filter((a) => !a.isDomestic);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lineNumber, setLineNumber] = useState("");
  const [lineType, setLineType] = useState<LineType>("NORMAL");
  const [month, setMonth] = useState("Jan");
  const [year, setYear] = useState(new Date().getFullYear());
  const [daysOffStart, setDaysOffStart] = useState<number | "">("");
  const [daysOffEnd, setDaysOffEnd] = useState<number | "">("");
  const [hasReserve, setHasReserve] = useState(false);
  const [reserveDays, setReserveDays] = useState<number[]>([]);
  const [layovers, setLayovers] = useState<LayoverEntry[]>([]);
  const [scheduleId, setScheduleId] = useState<string | null>(null);

  const [wantDaysOffStart, setWantDaysOffStart] = useState<number | "">("");
  const [wantDaysOffEnd, setWantDaysOffEnd] = useState<number | "">("");
  const [wantDestination, setWantDestination] = useState("");
  const [wantLineType, setWantLineType] = useState<"" | LineType>("");
  const [wantNoReserve, setWantNoReserve] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/schedule/line-summary")
      .then((r) => r.json())
      .then((json) => {
        const s = json?.data;
        if (!s) return;
        setLineNumber(s.lineNumber || "");
        setLineType(s.lineType || "NORMAL");
        setMonth(s.month || "Jan");
        setYear(s.year || new Date().getFullYear());
        setDaysOffStart(s.daysOffStart || "");
        setDaysOffEnd(s.daysOffEnd || "");
        setHasReserve(!!s.hasReserve);
        setReserveDays(Array.isArray(s.reserveDays) ? s.reserveDays : []);
        setScheduleId(s.scheduleId ?? null);
        if (Array.isArray(s.layovers)) {
          setLayovers(
            s.layovers.map((l: { destination: string; hours: number }) => ({
              destination: l.destination,
              hours: l.hours,
            }))
          );
        }
      })
      .catch(() => undefined)
      .finally(() => setLoadingSummary(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!lineNumber || daysOffStart === "" || daysOffEnd === "") {
      setError("Line number and days off range are required.");
      return;
    }
    if (hasReserve && reserveDays.length === 0) {
      setError("Pick at least one RR day when reserve is enabled.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/line-swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lineNumber,
        lineType,
        month,
        year,
        daysOffStart: Number(daysOffStart),
        daysOffEnd: Number(daysOffEnd),
        hasReserve,
        reserveDays: hasReserve ? reserveDays : [],
        wantDaysOffStart: wantDaysOffStart === "" ? null : Number(wantDaysOffStart),
        wantDaysOffEnd: wantDaysOffEnd === "" ? null : Number(wantDaysOffEnd),
        wantDestination: wantDestination || null,
        wantLineType: wantLineType || null,
        wantNoReserve,
        notes: notes || null,
        scheduleId,
        layovers: lineType === "RESERVE_LINE" ? [] : layovers,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSubmitting(false);

    if (!res.ok) {
      setError(json?.message || "Failed to post line swap.");
      return;
    }
    router.push("/dashboard/line-swap");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {loadingSummary ? (
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">Loading schedule summary...</div>
      ) : (
        <div className="rounded-lg bg-[#E8F5EA] px-3 py-2 text-sm text-[#3BA34A]">
          Auto-filled from your uploaded schedule. Review and adjust if needed.
        </div>
      )}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="rounded-xl border border-slate-200 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">My Line</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input value={lineNumber} onChange={(e) => setLineNumber(e.target.value)} placeholder="Line # (e.g. 404)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {monthOptions.map((m) => <option key={m}>{m}</option>)}
          </select>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>

        <div className="mt-3">
          <p className="mb-2 text-xs font-medium text-slate-500">Line type</p>
          <div className="flex flex-wrap gap-2">
            {lineTypeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLineType(option.value)}
                className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                  lineType === option.value
                    ? "border-[#2668B0] bg-[#E3EFF9] text-[#2668B0]"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input type="number" value={daysOffStart} onChange={(e) => setDaysOffStart(e.target.value ? Number(e.target.value) : "")} min={1} max={31} placeholder="Days off from" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input type="number" value={daysOffEnd} onChange={(e) => setDaysOffEnd(e.target.value ? Number(e.target.value) : "")} min={1} max={31} placeholder="Days off to" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={hasReserve} onChange={(e) => setHasReserve(e.target.checked)} />
          Has Reserve (RR) days
        </label>
        {hasReserve && (
          <div className="mt-2 rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-xs font-medium text-slate-500">Pick RR days</p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                const active = reserveDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      setReserveDays((prev) =>
                        prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
                      )
                    }
                    className={`h-8 w-8 rounded-md text-xs font-medium ${
                      active ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-slate-500">Layovers</p>
          {lineType === "RESERVE_LINE" ? (
            <p className="text-sm italic text-slate-400">Reserve line - no layovers</p>
          ) : (
            <>
              {layovers.map((layover, index) => (
                <div key={`${index}-${layover.destination}`} className="flex items-center gap-2">
                  <select
                    value={layover.destination}
                    onChange={(e) =>
                      setLayovers((prev) =>
                        prev.map((l, i) => (i === index ? { ...l, destination: e.target.value } : l))
                      )
                    }
                    className="w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Select destination</option>
                    {airports.map((airport) => (
                      <option key={airport.code} value={airport.code}>
                        {airport.code} - {airport.city}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    max={72}
                    value={layover.hours || ""}
                    onChange={(e) =>
                      setLayovers((prev) =>
                        prev.map((l, i) => (i === index ? { ...l, hours: Number(e.target.value) || 0 } : l))
                      )
                    }
                    className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-center text-sm"
                    placeholder="0"
                  />
                  <span className="text-xs text-slate-500">hrs</span>
                  <button
                    type="button"
                    onClick={() => setLayovers((prev) => prev.filter((_, i) => i !== index))}
                    className="ml-1 text-red-500 hover:text-red-700"
                  >
                    x
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setLayovers((prev) => [...prev, { destination: "", hours: 0 }])}
                className="text-sm text-[#2668B0] hover:underline"
              >
                + Add layover
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">What I Want</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input type="number" value={wantDaysOffStart} onChange={(e) => setWantDaysOffStart(e.target.value ? Number(e.target.value) : "")} min={1} max={31} placeholder="Preferred days off from" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input type="number" value={wantDaysOffEnd} onChange={(e) => setWantDaysOffEnd(e.target.value ? Number(e.target.value) : "")} min={1} max={31} placeholder="Preferred days off to" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div className="mt-3">
          <select
            value={wantDestination}
            onChange={(e) => setWantDestination(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Any destination</option>
            {airports.map((airport) => (
              <option key={airport.code} value={airport.code}>
                {airport.code} - {airport.city}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3">
          <p className="mb-2 text-xs font-medium text-slate-500">Preferred line type</p>
          <div className="flex flex-wrap gap-2">
            {wantLineTypeOptions.map((option) => (
              <button
                key={option.value || "ANY"}
                type="button"
                onClick={() => setWantLineType(option.value)}
                className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                  wantLineType === option.value
                    ? "border-[#2668B0] bg-[#E3EFF9] text-[#2668B0]"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={wantNoReserve} onChange={(e) => setWantNoReserve(e.target.checked)} />
          No Reserve (RR)
        </label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Looking for off 2-7 please..." className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => router.push("/dashboard/add-trade")}
          className="text-sm text-slate-500 hover:underline"
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-[#2668B0] px-6 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Posting..." : "Post to Line Swap Board"}
        </button>
      </div>
    </form>
  );
}
