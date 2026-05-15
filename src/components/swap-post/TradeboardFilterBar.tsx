"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { TimeFormatToggle } from "@/components/trip/TimeFormatToggle";

export interface SwapBoardFilters {
  tripType: "" | "LAYOVER" | "TURNAROUND" | "MULTI_STOP" | "PAIRING_WITH_LAYOVER";
  destination: string;
  sortBy: "match" | "recent" | "date_soon";
  routeType: "" | "domestic" | "international";
  dateFrom: string;
}

interface TradeboardFilterBarProps {
  filters: SwapBoardFilters;
  onChange: (next: SwapBoardFilters) => void;
  hasAdvancedFilters?: boolean;
  canUseMatchSort?: boolean;
  onRequireUpgrade?: () => void;
}

export function TradeboardFilterBar({
  filters,
  onChange,
  hasAdvancedFilters = true,
  canUseMatchSort = true,
  onRequireUpgrade,
}: TradeboardFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  useEffect(() => {
    if (!canUseMatchSort && filters.sortBy === "match") {
      onChange({ ...filters, sortBy: "recent" });
    }
  }, [canUseMatchSort, filters, onChange]);

  const activeFilterCount = useMemo(
    () => [filters.tripType, filters.destination.trim(), filters.routeType, filters.dateFrom].filter(Boolean).length,
    [filters]
  );

  function toggleFilters() {
    if (!hasAdvancedFilters) {
      onRequireUpgrade?.();
      return;
    }
    setIsExpanded((v) => !v);
  }

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={toggleFilters}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${
            activeFilterCount > 0
              ? "border-[#2668B0] bg-[#E3EFF9] text-[#2668B0]"
              : "border-slate-200 text-slate-600 hover:border-slate-300"
          }`}
          aria-expanded={isExpanded}
        >
          <SlidersHorizontal size={16} />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2668B0] px-1 text-[10px] text-white">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown size={14} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </button>

        <select
          value={filters.sortBy}
          onChange={(e) => {
            const nextSort = e.target.value as SwapBoardFilters["sortBy"];
            if (nextSort === "match" && !canUseMatchSort) {
              onRequireUpgrade?.();
              onChange({ ...filters, sortBy: "recent" });
              return;
            }
            onChange({ ...filters, sortBy: nextSort });
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
        >
          <option value="match" disabled={!canUseMatchSort}>
            Best match{!canUseMatchSort ? " (Premium)" : ""}
          </option>
          <option value="recent">Most recent</option>
          <option value="date_soon">Soonest date</option>
        </select>

        <div className="hidden sm:block">
          <TimeFormatToggle />
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Trip type</label>
              <select
                value={filters.tripType || ""}
                onChange={(e) => onChange({ ...filters, tripType: e.target.value as SwapBoardFilters["tripType"] })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="">All trip types</option>
                <option value="LAYOVER">Layovers</option>
                <option value="TURNAROUND">Round trips</option>
                <option value="MULTI_STOP">Pairing</option>
                <option value="PAIRING_WITH_LAYOVER">Pairing with Layover</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-500">Destination</label>
              <input
                type="text"
                placeholder="e.g. DXB, LHR"
                value={filters.destination}
                onChange={(e) => onChange({ ...filters, destination: e.target.value.toUpperCase() })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-500">Route</label>
              <select
                value={filters.routeType || ""}
                onChange={(e) => onChange({ ...filters, routeType: e.target.value as SwapBoardFilters["routeType"] })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="">All routes</option>
                <option value="domestic">Domestic</option>
                <option value="international">International</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-500">Search by date</label>
            <input
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 sm:w-56"
            />
          </div>

          <div className="sm:hidden mt-3 border-t border-slate-200 pt-3">
            <label className="mb-1 block text-xs text-slate-500">Time format</label>
            <TimeFormatToggle />
          </div>

          {activeFilterCount > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...filters,
                    tripType: "",
                    destination: "",
                    routeType: "",
                    dateFrom: "",
                  })
                }
                className="text-xs text-red-500 hover:text-red-700"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
