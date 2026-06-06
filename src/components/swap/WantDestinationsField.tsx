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

  const summaryText = wantOpenToAnyDestination
    ? "Anything — any destination"
    : wantDestinations.length === 0
      ? required
        ? "Want Destinations"
        : "Optional — tap to add"
      : wantDestinations.map((c) => airports.find((a) => a.code === c)?.city ?? c).join(", ");

  const summaryClass = wantOpenToAnyDestination
    ? "text-emerald-600 font-medium"
    : wantDestinations.length > 0
      ? "text-emerald-600 font-medium"
      : required
        ? "text-emerald-600 font-medium"
        : "text-faint";

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-content-soft">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </label>
      {description ? <p className="mb-2 text-xs text-muted">{description}</p> : null}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-xl border border-line bg-surface px-3 py-2.5 text-left text-sm text-content hover:border-line"
      >
        <span className={summaryClass}>{summaryText}</span>
        <ChevronRight size={18} className="shrink-0 text-faint" />
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

  const isEmpty = wantExclude.length === 0;
  const summaryText = isEmpty
    ? "No destinations"
    : wantExclude.map((c) => airports.find((a) => a.code === c)?.city ?? c).join(", ");

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-content-soft">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-xl border border-line bg-surface px-3 py-2.5 text-left text-sm text-content hover:border-line"
      >
        <span className="text-red-700 font-medium">{summaryText}</span>
        <ChevronRight size={18} className="shrink-0 text-faint" />
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
