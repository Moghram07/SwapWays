"use client";

import { Button } from "@/components/ui/button";
import { getAllAirports } from "@/utils/airportNames";

interface TradeFiltersProps {
  dateFrom: string;
  dateTo: string;
  destination: string;
  tradeType: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onDestinationChange: (v: string) => void;
  onTradeTypeChange: (v: string) => void;
  onReset: () => void;
}

export function TradeFilters({
  dateFrom,
  dateTo,
  destination,
  tradeType,
  onDateFromChange,
  onDateToChange,
  onDestinationChange,
  onTradeTypeChange,
  onReset,
}: TradeFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">From</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">To</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">Destination</label>
        <select
          value={destination}
          onChange={(e) => onDestinationChange(e.target.value)}
          className="text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400"
        >
          <option value="">All</option>
          {getAllAirports().map((a) => (
            <option key={a.code} value={a.code}>{a.code}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">Type</label>
        <select
          value={tradeType}
          onChange={(e) => onTradeTypeChange(e.target.value)}
          className="text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400"
        >
          <option value="">All</option>
          <option value="FLIGHT_SWAP">Flight swap</option>
          <option value="VACATION_SWAP">Vacation swap</option>
        </select>
      </div>
      <Button variant="outline" size="sm" onClick={onReset}>Reset</Button>
    </div>
  );
}
