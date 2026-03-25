"use client";

import { Timer, CalendarClock, Coins } from "lucide-react";
import { decimalHoursToDisplayTime } from "@/utils/timeUtils";

interface TripSummaryFooterProps {
  blockHours: number;
  tafb: number;
  /** When provided, Credit is shown (e.g. on My Flights cards). */
  creditHours?: number;
}

export function TripSummaryFooter({
  blockHours,
  tafb,
  creditHours,
}: TripSummaryFooterProps) {
  return (
    <div className="flex flex-wrap items-center gap-6 border-t border-gray-100 bg-gray-50 px-5 py-3 text-sm text-gray-500">
      <div className="flex items-center gap-1.5">
        <Timer size={14} />
        <span>
          Block: <strong>{decimalHoursToDisplayTime(blockHours)}</strong>
        </span>
      </div>
      {creditHours != null && (
        <div className="flex items-center gap-1.5">
          <Coins size={14} />
          <span>
            Credit: <strong>{decimalHoursToDisplayTime(creditHours)}</strong>
          </span>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <CalendarClock size={14} />
        <span>
          TAFB: <strong>{decimalHoursToDisplayTime(tafb)}</strong>
        </span>
      </div>
    </div>
  );
}
