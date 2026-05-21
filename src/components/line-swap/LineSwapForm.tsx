"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LineType } from "@/types/enums";
import { getInternationalAirports } from "@/utils/airportNames";
import { getTranslator } from "@/i18n/getTranslator";
import type { Locale } from "@/i18n/config";

const MONTH_VALUES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const LINE_TYPES: LineType[] = [
  "NORMAL",
  "US_LINE",
  "CHINA_LINE",
  "RESERVE_LINE",
  "KULN",
  "INDO",
  "HJLN",
  "TRNG",
];

const LINE_TYPE_LABEL_KEYS: Record<LineType, string> = {
  NORMAL: "dashboard.lineSwapTypeNORMAL",
  US_LINE: "dashboard.lineSwapTypeUS_LINE",
  CHINA_LINE: "dashboard.lineSwapTypeCHINA_LINE",
  RESERVE_LINE: "dashboard.lineSwapTypeRESERVE_LINE",
  KULN: "dashboard.lineSwapTypeKULN",
  INDO: "dashboard.lineSwapTypeINDO",
  HJLN: "dashboard.lineSwapTypeHJLN",
  TRNG: "dashboard.lineSwapTypeTRNG",
};

type LayoverEntry = { destination: string; hours: number };

export function LineSwapForm({ locale, editId }: { locale: Locale; editId?: string | null }) {
  const t = getTranslator(locale);
  const router = useRouter();
  const airports = getInternationalAirports();
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextMonthDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
  const [postMonth, setPostMonth] = useState(MONTH_VALUES[nextMonthDate.getMonth()]);
  const [postYear, setPostYear] = useState(nextMonthDate.getFullYear());

  const [lineNumber, setLineNumber] = useState("");
  const [lineType, setLineType] = useState<LineType>("NORMAL");
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
    const _nextMonthDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
    const _defaultMonth = MONTH_VALUES[_nextMonthDate.getMonth()];
    const _defaultYear = _nextMonthDate.getFullYear();
    if (editId) {
      fetch(`/api/line-swap/${editId}`)
        .then((r) => r.json())
        .then((json) => {
          const s = json?.data;
          if (!s) return;
          setLineNumber(s.lineNumber || "");
          setLineType(s.lineType || "NORMAL");
          setPostMonth(MONTH_VALUES.includes(s.month) ? s.month : _defaultMonth);
          setPostYear(s.year || _defaultYear);
          setDaysOffStart(s.daysOffStart || "");
          setDaysOffEnd(s.daysOffEnd || "");
          setHasReserve(!!s.hasReserve);
          setReserveDays(Array.isArray(s.reserveDays) ? s.reserveDays : []);
          setWantDaysOffStart(s.wantDaysOffStart ?? "");
          setWantDaysOffEnd(s.wantDaysOffEnd ?? "");
          setWantDestination(s.wantDestination || "");
          setWantLineType(s.wantLineType || "");
          setWantNoReserve(!!s.wantNoReserve);
          setNotes(s.notes || "");
          if (Array.isArray(s.layovers)) {
            setLayovers(s.layovers.map((l: { destination: string; durationHours: number }) => ({
              destination: l.destination,
              hours: Math.floor(l.durationHours),
            })));
          }
        })
        .catch(() => undefined)
        .finally(() => setLoadingSummary(false));
      return;
    }

    fetch("/api/schedule/line-summary")
      .then((r) => r.json())
      .then((json) => {
        const s = json?.data;
        if (!s) return;
        setLineNumber(s.lineNumber || "");
        setLineType(s.lineType || "NORMAL");
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
  }, [editId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!lineNumber || daysOffStart === "" || daysOffEnd === "") {
      setError(t("dashboard.lineSwapErrLineRequired"));
      return;
    }
    if (hasReserve && reserveDays.length === 0) {
      setError(t("dashboard.lineSwapErrReserveDays"));
      return;
    }

    setSubmitting(true);
    const url = editId ? `/api/line-swap/${editId}` : "/api/line-swap";
    const res = await fetch(url, {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lineNumber,
        lineType,
        month: postMonth,
        year: postYear,
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
      setError(json?.message || t("dashboard.lineSwapErrPostFailed"));
      return;
    }
    router.push("/dashboard/line-swap");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!editId && (
        loadingSummary ? (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
            {t("dashboard.lineSwapLoadingSummary")}
          </div>
        ) : (
          <div className="rounded-lg bg-[#E8F5EA] px-3 py-2 text-sm text-[#3BA34A]">
            {t("dashboard.lineSwapAutoFilledHint")}
          </div>
        )
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-xl border border-slate-200 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">{t("dashboard.lineSwapMyLine")}</h3>
        <input
          name="lineNumber"
          value={lineNumber}
          onChange={(e) => setLineNumber(e.target.value)}
          placeholder={t("dashboard.lineSwapLineNumberPh")}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
        />

        <div className="mt-3">
          <p className="mb-2 text-xs font-medium text-slate-500">{t("dashboard.lineSwapLineType")}</p>
          <div className="flex flex-wrap gap-2">
            {LINE_TYPES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setLineType(value)}
                className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                  lineType === value
                    ? "border-[#2668B0] bg-[#E3EFF9] text-[#2668B0]"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {t(LINE_TYPE_LABEL_KEYS[value])}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            name="daysOffStart"
            type="number"
            value={daysOffStart}
            onChange={(e) => setDaysOffStart(e.target.value ? Number(e.target.value) : "")}
            min={1}
            max={31}
            placeholder={t("dashboard.lineSwapDaysOffFrom")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
          />
          <input
            name="daysOffEnd"
            type="number"
            value={daysOffEnd}
            onChange={(e) => setDaysOffEnd(e.target.value ? Number(e.target.value) : "")}
            min={1}
            max={31}
            placeholder={t("dashboard.lineSwapDaysOffTo")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input name="hasReserve" type="checkbox" checked={hasReserve} onChange={(e) => setHasReserve(e.target.checked)} />
          {t("dashboard.lineSwapHasReserve")}
        </label>
        {hasReserve && (
          <div className="mt-2 rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-xs font-medium text-slate-500">{t("dashboard.lineSwapPickRrDays")}</p>
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
          <p className="text-xs font-medium text-slate-500">{t("dashboard.lineSwapLayovers")}</p>
          {lineType === "RESERVE_LINE" ? (
            <p className="text-sm italic text-slate-400">{t("dashboard.lineSwapReserveNoLayovers")}</p>
          ) : (
            <>
              {layovers.map((layover, index) => (
                <div key={`${index}-${layover.destination}`} className="flex flex-wrap items-center gap-2">
                  <select
                    name={`layoverDestination-${index}`}
                    value={layover.destination}
                    onChange={(e) =>
                      setLayovers((prev) =>
                        prev.map((l, i) => (i === index ? { ...l, destination: e.target.value } : l))
                      )
                    }
                    className="w-48 max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
                  >
                    <option value="">{t("dashboard.lineSwapSelectDestination")}</option>
                    {airports.map((airport) => (
                      <option key={airport.code} value={airport.code}>
                        {airport.code} - {airport.city}
                      </option>
                    ))}
                  </select>
                  <input
                    name={`layoverHours-${index}`}
                    type="number"
                    min={0}
                    max={72}
                    value={layover.hours || ""}
                    onChange={(e) =>
                      setLayovers((prev) =>
                        prev.map((l, i) => (i === index ? { ...l, hours: Number(e.target.value) || 0 } : l))
                      )
                    }
                    className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-sm text-gray-900 placeholder:text-gray-400"
                    placeholder="0"
                  />
                  <span className="text-xs text-slate-500">{t("dashboard.lineSwapHoursAbbr")}</span>
                  <button
                    type="button"
                    onClick={() => setLayovers((prev) => prev.filter((_, i) => i !== index))}
                    className="ms-1 text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setLayovers((prev) => [...prev, { destination: "", hours: 0 }])}
                className="text-sm text-[#2668B0] hover:underline"
              >
                {t("dashboard.lineSwapAddLayover")}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">{t("dashboard.lineSwapWhatIWant")}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            name="wantDaysOffStart"
            type="number"
            value={wantDaysOffStart}
            onChange={(e) => setWantDaysOffStart(e.target.value ? Number(e.target.value) : "")}
            min={1}
            max={31}
            placeholder={t("dashboard.lineSwapPreferredDaysOffFrom")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
          />
          <input
            name="wantDaysOffEnd"
            type="number"
            value={wantDaysOffEnd}
            onChange={(e) => setWantDaysOffEnd(e.target.value ? Number(e.target.value) : "")}
            min={1}
            max={31}
            placeholder={t("dashboard.lineSwapPreferredDaysOffTo")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <div className="mt-3">
          <select
            name="wantDestination"
            value={wantDestination}
            onChange={(e) => setWantDestination(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
          >
            <option value="">{t("dashboard.lineSwapAnyDestination")}</option>
            {airports.map((airport) => (
              <option key={airport.code} value={airport.code}>
                {airport.code} - {airport.city}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3">
          <p className="mb-2 text-xs font-medium text-slate-500">{t("dashboard.lineSwapPreferredLineType")}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setWantLineType("")}
              className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                wantLineType === ""
                  ? "border-[#2668B0] bg-[#E3EFF9] text-[#2668B0]"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {t("dashboard.lineSwapWantAny")}
            </button>
            {LINE_TYPES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setWantLineType(value)}
                className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                  wantLineType === value
                    ? "border-[#2668B0] bg-[#E3EFF9] text-[#2668B0]"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {t(LINE_TYPE_LABEL_KEYS[value])}
              </button>
            ))}
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input name="wantNoReserve" type="checkbox" checked={wantNoReserve} onChange={(e) => setWantNoReserve(e.target.checked)} />
          {t("dashboard.lineSwapNoReserve")}
        </label>
        <p className="mb-1 mt-3 text-xs font-medium text-slate-500">{t("dashboard.lineSwapNotesLabel")}</p>
        <textarea
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={t("dashboard.lineSwapNotesPh")}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push("/dashboard/add-trade")}
          className="text-sm text-slate-500 hover:underline"
        >
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className="rtl:rotate-180">
              ←
            </span>
            {t("dashboard.lineSwapBack")}
          </span>
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-[#2668B0] px-6 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {editId
            ? (submitting ? t("dashboard.lineSwapSaving") : t("dashboard.lineSwapSaveChanges"))
            : (submitting ? t("dashboard.lineSwapPosting") : t("dashboard.lineSwapSubmit"))}
        </button>
      </div>
    </form>
  );
}
