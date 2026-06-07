"use client";

import { Moon } from "lucide-react";
import { getAirportCity } from "@/utils/airportNames";

export type AirportNodeVariant = "green" | "blue" | "orange" | "purple";

// Accent colors use tokens (var) so blue/amber/purple stay readable in dark mode.
// Nodes are now hollow (bold border, no fill); green keeps its literal brand green.
const variantColors: Record<AirportNodeVariant, { border: string; text: string }> = {
  green:  { border: "border-[#3BA34A]",            text: "text-[#3BA34A]" },
  blue:   { border: "border-[var(--node-blue)]",   text: "text-[var(--node-blue)]" },
  orange: { border: "border-amber-500",            text: "text-[var(--node-amber)]" },
  purple: { border: "border-[var(--node-purple)]", text: "text-[var(--node-purple)]" },
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
          isLayover || isHighlighted
            ? `border-2 ${colors.border} bg-surface`
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
