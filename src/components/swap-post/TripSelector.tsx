"use client";

import { Check } from "lucide-react";
import { getTripTypeInfo, type TripType } from "@/utils/tripClassifier";
import { getAirportCity } from "@/utils/airportNames";
import { decimalHoursToDisplayTime } from "@/utils/timeUtils";
import { formatDisplayDate } from "@/utils/dateUtils";
import { useDashboardLocale } from "@/contexts/DashboardLocaleContext";
import { getTranslator } from "@/i18n/getTranslator";

const PRIMARY = "#1E6FB9";

function tripBadgeLabel(type: TripType, t: (key: string) => string): string {
  switch (type) {
    case "LAYOVER":
      return t("dashboard.tripBadgeLayover");
    case "TURNAROUND":
      return t("dashboard.tripBadgeTurnaround");
    case "MULTI_STOP":
      return t("dashboard.tripBadgeMultiStop");
    default:
      return type;
  }
}

export interface TripOption {
  id: string;
  tripNumber: string;
  startDate: Date;
  creditHours: number;
  tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
  legs: { flightNumber: string; departureAirport: string; arrivalAirport: string; arrivalDate?: string | Date }[];
  layovers: { airport: string; durationDecimal: number }[];
}

interface TripSelectorProps {
  trips: TripOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onNext: () => void;
  onBack: () => void;
  /** When true, Next is enabled even with 0 selected. */
  allowEmpty?: boolean;
}

export function TripSelector({ trips, selected, onChange, onNext, onBack, allowEmpty }: TripSelectorProps) {
  const locale = useDashboardLocale();
  const t = getTranslator(locale);

  function displayFlightNumber(raw: string | undefined) {
    const s = (raw ?? "").trim();
    return s.toUpperCase().startsWith("DH") ? s.slice(2) : s;
  }

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  const selectedTrips = trips.filter((t) => selected.includes(t.id));
  const totalCredit = selectedTrips.reduce((sum, t) => sum + t.creditHours, 0);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">{t("dashboard.tripSelectTitle")}</h2>
      <p className="text-sm text-slate-500">{t("dashboard.tripSelectSubtitle")}</p>

      <div className="space-y-2">
        {trips.map((trip) => {
          const isSelected = selected.includes(trip.id);
          const typeInfo = getTripTypeInfo(trip.tripType);
          const typeLabel = tripBadgeLabel(trip.tripType, t);
          let destinationLabel: string;
          if (trip.tripType === "TURNAROUND" || trip.tripType === "LAYOVER") {
            const firstArrival = trip.legs[0]?.arrivalAirport;
            destinationLabel = firstArrival ? getAirportCity(firstArrival) : "—";
          } else if (trip.tripType === "MULTI_STOP") {
            const destinations = [...new Set(trip.legs.map((l) => l.arrivalAirport).filter((a) => a))];
            destinationLabel = destinations.map((d) => getAirportCity(d)).join(" + ") || "—";
          } else {
            const destinations = [...new Set(trip.legs.map((l) => l.arrivalAirport).filter((a) => a))];
            destinationLabel = destinations.map((d) => getAirportCity(d)).join(" + ") || "—";
          }

          return (
            <button
              key={trip.id}
              type="button"
              onClick={() => toggle(trip.id)}
              className={`w-full rounded-xl border-2 p-3 text-start transition-colors ${
                isSelected ? "border-[#2668B0] " + typeInfo.bgColor : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                      isSelected ? "border-[#2668B0] bg-[#2668B0]" : "border-slate-300"
                    }`}
                  >
                    {isSelected && <Check size={14} className="text-white" />}
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${typeInfo.bgColor} ${typeInfo.textColor}`}
                  >
                    {typeLabel}
                  </span>
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900">
                      SV{displayFlightNumber(trip.legs[0]?.flightNumber) || "—"}
                    </span>
                    {trip.legs.some((l) => (l.flightNumber ?? "").toUpperCase().startsWith("DH")) && (
                      <span className="ms-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {t("dashboard.tripDeadHeadBadge")}
                      </span>
                    )}
                    <span className="mx-1 text-slate-400">·</span>
                    <span className="text-sm text-slate-600">{destinationLabel}</span>
                  </div>
                </div>
                <div className="shrink-0 text-end text-sm text-slate-500">
                  <div>{formatDisplayDate(trip.startDate)}</div>
                  <div>
                    {t("dashboard.tripRowCreditLabel")} {decimalHoursToDisplayTime(trip.creditHours)}
                  </div>
                </div>
              </div>
            </button>
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
        <button type="button" onClick={onBack} className="text-sm text-slate-500 hover:underline">
          <span className="inline-flex items-center gap-1">
            <span className="rtl:rotate-180" aria-hidden>
              ←
            </span>
            {t("dashboard.postFlowBack")}
          </span>
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!allowEmpty && selected.length === 0}
          className="rounded-lg bg-slate-800 px-6 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <span className="inline-flex items-center gap-1">
            {t("dashboard.postFlowNext")}
            <span className="rtl:rotate-180" aria-hidden>
              →
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
