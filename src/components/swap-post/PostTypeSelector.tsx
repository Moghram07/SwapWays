"use client";

import type { SwapPostType } from "@/types/swapPost";
import { RefreshCw, Hand, Plane, CalendarRange, CalendarDays } from "lucide-react";

const PRIMARY = "#1E6FB9";
const ACCENT = "#2DAF66";

const options: { type: SwapPostType; label: string; icon: React.ElementType; description: string }[] = [
  { type: "OFFERING_TRIPS", label: "Offer flights for swap", icon: RefreshCw, description: "I have trips I want to trade" },
  { type: "GIVING_AWAY", label: "Give away flights", icon: Hand, description: "Take my flights, I want days off" },
  { type: "OFFERING_DAYS_OFF", label: "Want to fly", icon: Plane, description: "I have days off, I want flights" },
  { type: "VACATION_SWAP", label: "Vacation swap", icon: CalendarRange, description: "Swap my vacation period for different dates" },
];

interface PostTypeSelectorProps {
  onSelect: (type: SwapPostType) => void;
  onSelectLineSwap?: () => void;
}

export function PostTypeSelector({ onSelect, onSelectLineSwap }: PostTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">What would you like to do?</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map(({ type, label, icon: Icon, description }) => (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            className="flex items-start gap-4 rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition-colors hover:border-[#2668B0] hover:bg-slate-50/50"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${PRIMARY}18` }}
            >
              <Icon className="h-5 w-5" style={{ color: PRIMARY }} />
            </div>
            <div>
              <p className="font-medium text-slate-900">{label}</p>
              <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            </div>
          </button>
        ))}
        {onSelectLineSwap && (
          <button
            type="button"
            onClick={onSelectLineSwap}
            className="flex items-start gap-4 rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition-colors hover:border-[#2668B0] hover:bg-slate-50/50"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${PRIMARY}18` }}
            >
              <CalendarDays className="h-5 w-5" style={{ color: PRIMARY }} />
            </div>
            <div>
              <p className="font-medium text-slate-900">Line swap</p>
              <p className="mt-0.5 text-sm text-slate-500">Trade your full monthly line with another crew member</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
