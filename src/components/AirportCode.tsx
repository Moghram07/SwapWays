"use client";

import { useState } from "react";
import { getAirportCity } from "@/utils/airportNames";

export function AirportCode({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  if (!code) return null;
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        onBlur={() => setOpen(false)}
        className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
      >
        {code}
      </button>
      {open && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white">
          {getAirportCity(code)}
        </span>
      )}
    </span>
  );
}
