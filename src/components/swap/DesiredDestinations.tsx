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

  const popularCodes = ["CAI", "DXB", "IST", "LHR", "MAD", "KUL", "AMM", "RUH"];

  return (
    <div>
      {!hideLabel && (
        <label className="mb-2 block text-sm font-medium text-gray-700">
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
                className="inline-flex items-center gap-1 rounded-full bg-[#E3EFF9] px-2.5 py-1 text-xs font-medium text-gray-900"
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
          className="pointer-events-none absolute left-3 top-2.5 text-gray-500"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by city or airport code…"
          className="w-full text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 pl-9 pr-3 text-sm placeholder:text-gray-400"
        />
      </div>

      {search.trim().length > 0 && (
        <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white text-sm shadow-sm">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-gray-500">No airports found</div>
          ) : (
            filtered.map((airport) => (
              <button
                key={airport.code}
                type="button"
                onClick={() => {
                  toggle(airport.code);
                  setSearch("");
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-gray-800 hover:bg-gray-100 hover:text-gray-900 ${
                  selected.includes(airport.code)
                    ? "bg-[#E8F5EA] font-medium text-[#166534]"
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

      {search.trim().length === 0 && selected.length === 0 && (
        <div className="mt-2">
          <p className="mb-1.5 text-xs text-gray-500">Popular</p>
          <div className="flex flex-wrap gap-1.5">
            {popularCodes.map((code) => {
              const airport = allAirports.find((a) => a.code === code);
              if (!airport) return null;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggle(code)}
                  className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:border-[#2668B0] hover:bg-gray-100 hover:text-gray-900"
                >
                  {code} – {airport.city}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

