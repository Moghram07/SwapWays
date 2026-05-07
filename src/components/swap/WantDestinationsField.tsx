"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { getAllAirports } from "@/utils/airportNames";
import { AirportMultiSelectModal } from "@/components/swap/AirportMultiSelectModal";

interface WantDestinationsFieldProps {
  label: string;
  description?: string;
  wantOpenToAnyDestination: boolean;
  wantDestinations: string[];
  onChange: (next: { wantOpenToAnyDestination: boolean; wantDestinations: string[] }) => void;
  required?: boolean;
  accentClassName?: string;
}

export function WantDestinationsField({
  label,
  description,
  wantOpenToAnyDestination,
  wantDestinations,
  onChange,
  required = false,
  accentClassName,
}: WantDestinationsFieldProps) {
  const [open, setOpen] = useState(false);
  const airports = useMemo(() => getAllAirports(), []);

  const summary = wantOpenToAnyDestination
    ? "Anything — any destination"
    : wantDestinations.length === 0
      ? required
        ? "Tap to choose"
        : "Optional — tap to add"
      : wantDestinations.map((c) => airports.find((a) => a.code === c)?.city ?? c).join(", ");

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </label>
      {description ? <p className="mb-2 text-xs text-slate-500">{description}</p> : null}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-800 hover:border-slate-300"
      >
        <span className={wantDestinations.length === 0 && !wantOpenToAnyDestination ? "text-slate-400" : ""}>
          {summary}
        </span>
        <ChevronRight size={18} className="shrink-0 text-slate-400" />
      </button>
      <AirportMultiSelectModal
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        showAnythingOption
        anythingSelected={wantOpenToAnyDestination}
        selectedCodes={wantDestinations}
        accentClassName={accentClassName}
        onApply={({ codes, anythingSelected }) =>
          onChange({
            wantOpenToAnyDestination: anythingSelected,
            wantDestinations: anythingSelected ? [] : codes,
          })
        }
      />
    </div>
  );
}

interface ExcludeDestinationsFieldProps {
  label: string;
  wantExclude: string[];
  onChange: (codes: string[]) => void;
  accentClassName?: string;
}

export function ExcludeDestinationsField({
  label,
  wantExclude,
  onChange,
  accentClassName,
}: ExcludeDestinationsFieldProps) {
  const [open, setOpen] = useState(false);
  const airports = useMemo(() => getAllAirports(), []);

  const summary =
    wantExclude.length === 0
      ? "None — tap to exclude airports"
      : wantExclude.map((c) => airports.find((a) => a.code === c)?.city ?? c).join(", ");

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-800 hover:border-slate-300"
      >
        <span className={wantExclude.length === 0 ? "text-slate-400" : ""}>{summary}</span>
        <ChevronRight size={18} className="shrink-0 text-slate-400" />
      </button>
      <AirportMultiSelectModal
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        showAnythingOption={false}
        anythingSelected={false}
        selectedCodes={wantExclude}
        accentClassName={accentClassName}
        onApply={({ codes }) => onChange(codes)}
      />
    </div>
  );
}
