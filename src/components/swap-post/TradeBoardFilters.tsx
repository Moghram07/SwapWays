"use client";

import { useMemo, useState } from "react";
import type { SwapPostType } from "@/types/swapPost";
import { WtfDayPicker } from "@/components/swap/WtfDayPicker";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface SwapBoardFilters {
  postType: SwapPostType | "";
  tripType: "" | "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
  destination: string;
  sortBy: "match" | "recent" | "block_high" | "block_low" | "date_soon";
  lookingForCurrentDays: number[];
  lookingForNextDays: number[];
  routeType: "" | "domestic" | "international";
}

interface TradeBoardFiltersProps {
  filters: SwapBoardFilters;
  onChange: (f: SwapBoardFilters) => void;
  hasAdvancedFilters?: boolean;
  onRequireUpgrade?: () => void;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function daySummary(
  monthName: string,
  days: number[]
): string {
  if (days.length === 0) return "";
  return `${monthName}: ${days.slice(0, 5).join(", ")}${days.length > 5 ? ` +${days.length - 5}` : ""}`;
}

export function TradeBoardFilters({
  filters,
  onChange,
  hasAdvancedFilters = true,
  onRequireUpgrade,
}: TradeBoardFiltersProps) {
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const now = useMemo(() => new Date(), []);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
  const today = now.getDate();

  const currentMonthLabel = MONTH_NAMES[currentMonth - 1];
  const nextMonthLabel = MONTH_NAMES[nextMonth - 1];
  const summaryParts = [
    daySummary(currentMonthLabel, filters.lookingForCurrentDays),
    daySummary(nextMonthLabel, filters.lookingForNextDays),
  ].filter(Boolean);
  const daySummaryText = summaryParts.length ? summaryParts.join(" · ") : "No days selected";
  const totalSelected = filters.lookingForCurrentDays.length + filters.lookingForNextDays.length;

  const hasActiveFilters =
    !!filters.postType || !!filters.tripType || !!filters.destination || !!filters.routeType ||
    filters.lookingForCurrentDays.length > 0 || filters.lookingForNextDays.length > 0;

  const filterRow = (
    <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sort</span>
        <select
          value={filters.sortBy}
          onChange={(e) =>
            onChange({
              ...filters,
              sortBy: (e.target.value || "match") as SwapBoardFilters["sortBy"],
            })
          }
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
        >
          <option value="match">Best match first</option>
          <option value="recent">Most recent first</option>
          <option value="block_high">Highest block hours</option>
          <option value="block_low">Lowest block hours</option>
          <option value="date_soon">Soonest date</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">What</span>
        <div className="flex flex-col gap-2">
        <select
            value={filters.postType}
            onChange={(e) => onChange({ ...filters, postType: (e.target.value || "") as SwapBoardFilters["postType"] })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
          >
            <option value="">All post types</option>
            <option value="OFFERING_TRIPS">Flight Swap</option>
            <option value="VACATION_SWAP">Vacation swap</option>
          </select>
          <select
            value={filters.tripType}
            onChange={(e) => onChange({ ...filters, tripType: (e.target.value || "") as SwapBoardFilters["tripType"] })}
            disabled={!hasAdvancedFilters}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
          >
            <option value="">All trip types</option>
            <option value="LAYOVER">Layovers only</option>
            <option value="TURNAROUND">Round Trips only</option>
            <option value="MULTI_STOP">Pairing only</option>
          </select>
        </div>
      </div>
        <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Where</span>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={filters.destination}
              onChange={(e) => onChange({ ...filters, destination: e.target.value })}
              placeholder="Destination (e.g. DXB)"
              disabled={!hasAdvancedFilters}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500"
            />
            <select
              value={filters.routeType}
              onChange={(e) => onChange({ ...filters, routeType: (e.target.value || "") as SwapBoardFilters["routeType"] })}
              disabled={!hasAdvancedFilters}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">All routes</option>
              <option value="domestic">Domestic only</option>
              <option value="international">International only</option>
            </select>
          </div>
        </div>
      </div>
  );

  return (
    <div className="space-y-4">
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="w-full flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          aria-expanded={filtersOpen}
        >
          Filters
          {hasActiveFilters && (
            <span className="text-xs font-normal text-slate-500">Active</span>
          )}
          {filtersOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {filtersOpen && <div className="mt-3 space-y-3">{filterRow}</div>}
      </div>
      <div className="hidden md:block">{filterRow}</div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/50 overflow-hidden">
        <button
          type="button"
          onClick={() => {
            if (!hasAdvancedFilters) {
              onRequireUpgrade?.();
              return;
            }
            setDayPickerOpen((o) => !o);
          }}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-100/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-inset"
          aria-expanded={dayPickerOpen}
        >
          <span className="flex items-center gap-2">
            {dayPickerOpen ? (
              <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
            )}
            <span className="text-sm font-medium text-gray-700">Pick days</span>
            {!hasAdvancedFilters ? (
              <span className="rounded-full bg-[#E3EFF9] px-2 py-0.5 text-[10px] font-semibold text-[#2668B0]">
                Premium
              </span>
            ) : null}
            <span className="text-xs text-slate-500 font-normal">
              {totalSelected > 0 ? `${totalSelected} day${totalSelected === 1 ? "" : "s"} selected` : ""}
            </span>
          </span>
          <span className="text-sm text-slate-600 truncate max-w-[60%]">{daySummaryText}</span>
        </button>
        {dayPickerOpen && (
          <div className="border-t border-slate-200 p-4 pt-3">
            <p className="mb-3 text-xs text-gray-500">
              Show posts with trips on these days (this month and next month).
            </p>
            <div className="overflow-x-auto">
              <div className="flex min-w-max gap-8 pr-2 sm:flex-wrap">
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-600">
                    {currentMonthLabel} {currentYear}
                  </p>
                  <WtfDayPicker
                    label=""
                    selectedDays={filters.lookingForCurrentDays}
                    scheduledDays={[]}
                    month={currentMonth}
                    year={currentYear}
                    minSelectableDay={today}
                    onChange={(days) => onChange({ ...filters, lookingForCurrentDays: days })}
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-600">
                    {nextMonthLabel} {nextYear}
                  </p>
                  <WtfDayPicker
                    label=""
                    selectedDays={filters.lookingForNextDays}
                    scheduledDays={[]}
                    month={nextMonth}
                    year={nextYear}
                    onChange={(days) => onChange({ ...filters, lookingForNextDays: days })}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
