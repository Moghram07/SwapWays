"use client";

import { Moon } from "lucide-react";
import { getAirportCity } from "@/utils/airportNames";

export type AirportNodeVariant = "green" | "blue" | "orange" | "purple";

const variantColors: Record<AirportNodeVariant, { border: string; bg: string; text: string }> = {
  green:  { border: "border-[#3BA34A]",  bg: "bg-green-50",  text: "text-[#3BA34A]" },
  blue:   { border: "border-[#2668B0]",  bg: "bg-blue-50",   text: "text-[#2668B0]" },
  orange: { border: "border-amber-500",  bg: "bg-amber-50",  text: "text-amber-700" },
  purple: { border: "border-orange-400", bg: "bg-purple-50", text: "text-purple-700" },
};

interface AirportNodeProps {
  code: string;
  isLayover?: boolean;
  /** Non-layover destination node — gets variant colors without moon/thick border */
  isHighlighted?: boolean;
  variant?: AirportNodeVariant;
  time?: string;
  timeColor?: string;
}

export function AirportNode({ code, isLayover, isHighlighted, variant = "green", time, timeColor }: AirportNodeProps) {
  const city = getAirportCity(code);
  const colors = variantColors[variant];
  const isColored = isLayover || isHighlighted;

  return (
    <div className="relative flex flex-col items-center pt-4">
      {isLayover && (
        <Moon
          className={`absolute top-0.5 left-1/2 -translate-x-1/2 h-3 w-3 ${colors.text}`}
        />
      )}
      <div
        className={`w-full rounded-lg border px-2 py-1 text-center ${
          isLayover
            ? `border-2 ${colors.border} ${colors.bg}`
            : isHighlighted
              ? `${colors.border} ${colors.bg}`
              : "border-line bg-surface"
        }`}
      >
        <div
          className={`text-xs font-bold leading-tight ${
            isColored ? colors.text : "text-content"
          }`}
        >
          {code}
        </div>
        <div
          className={`text-[9px] leading-tight ${
            isColored ? colors.text : "text-faint"
          }`}
        >
          {city}
        </div>
        {time && (
          <div
            className={`mt-0.5 text-[9px] font-medium leading-tight ${
              timeColor ?? (isColored ? colors.text : "text-muted")
            }`}
          >
            {time}
          </div>
        )}
      </div>
    </div>
  );
}
