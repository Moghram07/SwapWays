"use client";

import { ArrowLeftRight } from "lucide-react";

interface SwapButtonProps {
  tripId: string;
  onSwap: (id: string) => void;
}

export function SwapButton({ tripId, onSwap }: SwapButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSwap(tripId)}
      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 active:bg-slate-900"
    >
      <ArrowLeftRight size={16} />
      Swap
    </button>
  );
}
