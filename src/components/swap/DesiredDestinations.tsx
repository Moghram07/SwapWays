"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { getAllAirports } from "@/utils/airportNames";

interface DesiredDestinationsProps {
  selected: string[];
  onChange: (codes: string[]) => void;
  /** When true, do not render the internal "Desired destinations" label (parent provides its own). */
  hideLabel?: boolean;
}

export function DesiredDestinations({ selected, onChange, hideLabel }: DesiredDestinationsProps) {
  const [search, setSearch] = useState("");

  const allAirports = useMemo(() => getAllAirports(), []);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allAirports.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q)
    );
  }, [allAirports, search]);

  function toggle(code: string) {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  }

  return (
    <div>
      {!hideLabel && (
        <label className="mb-2 block text-sm font-medium text-content-soft">
          Desired destinations
        </label>
      )}

      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((code) => {
            const airport = allAirports.find((a) => a.code === code);
            return (
              <span
                key={code}
                className="inline-flex items-center gap-1 rounded-full bg-brand-blue-soft px-2.5 py-1 text-xs font-medium text-content"
              >
                {code} – {airport?.city ?? code}
                <button
                  type="button"
                  onClick={() => toggle(code)}
                  className="hover:text-red-500"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute start-3 top-2.5 text-muted"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by city or airport code…"
          className="w-full text-content bg-surface border border-line rounded-lg px-3 py-2 ps-9 pe-3 text-sm placeholder:text-faint"
        />
      </div>

      {search.trim().length > 0 && (
        <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-line bg-surface text-sm shadow-sm">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-muted">No airports found</div>
          ) : (
            filtered.map((airport) => (
              <button
                key={airport.code}
                type="button"
                onClick={() => {
                  toggle(airport.code);
                  setSearch("");
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-start text-content hover:bg-surface-2 hover:text-content ${
                  selected.includes(airport.code)
                    ? "bg-brand-green-soft font-medium text-[#166534]"
                    : ""
                }`}
              >
                <span>
                  {airport.code} – {airport.city}
                </span>
                {selected.includes(airport.code) && <span>✓</span>}
              </button>
            ))
          )}
        </div>
      )}

    </div>
  );
}

