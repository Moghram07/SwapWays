"use client";

import type { ReactNode } from "react";

interface MatchBadgeProps {
  percent: number | null;
  tier?: "low" | "medium" | "high" | "none";
  reasons: string[];
  showTooltip?: boolean;
  bestTripLabel?: string;
  userTier?: "FREE" | "PREMIUM";
}

function getMatchColor(percent: number): { bg: string; text: string } {
  if (percent >= 80) return { bg: "bg-green-100", text: "text-green-800" };
  if (percent >= 60) return { bg: "bg-[#E8F5EA]", text: "text-[#3BA34A]" };
  if (percent >= 40) return { bg: "bg-yellow-100", text: "text-yellow-800" };
  if (percent >= 20) return { bg: "bg-orange-100", text: "text-orange-800" };
  return { bg: "bg-gray-100", text: "text-gray-600" };
}

/** Tier maps to dot color when exact % is unavailable (FREE + gated). */
function tierDotClass(tier: "low" | "medium" | "high" | "none"): string {
  if (tier === "high") return "bg-[#3BA34A]";
  if (tier === "medium") return "bg-amber-500";
  if (tier === "low") return "bg-gray-400";
  return "bg-slate-300";
}

export function MatchBadge({
  percent,
  tier = "none",
  reasons,
  showTooltip = true,
  bestTripLabel,
  userTier = "PREMIUM",
}: MatchBadgeProps) {
  void bestTripLabel;

  const pill = (body: ReactNode, color: { bg: string; text: string }) => (
    <div
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${color.bg} ${color.text}`}
    >
      {body}
    </div>
  );

  if (percent != null && percent > 0) {
    const color = getMatchColor(percent);
    const node = pill(`${Math.round(percent)}%`, color);

    if (!showTooltip || reasons.length === 0) {
      return <div className="group relative inline-flex">{node}</div>;
    }

    return (
      <div className="group relative inline-flex">
        {node}
        <div className="pointer-events-none absolute right-0 top-full z-30 mt-2 w-64 translate-y-1 opacity-0 transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
            <p className="mb-1.5 border-b border-white/15 pb-1.5 text-[10px] font-normal leading-snug opacity-80">
              Each line is scoring detail. &quot;You&quot; is you; &quot;They&quot; is the crew member who posted.
            </p>
            {reasons.slice(0, 4).map((reason, idx) => (
              <p key={idx} className="opacity-85">
                • {reason}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (userTier === "FREE" && tier !== "none") {
    const dot = tierDotClass(tier);
    return (
      <div className="group relative inline-flex">
        <div
          className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-1"
          title=""
        >
          <span className={`h-2 w-2 rounded-full ${dot}`} />
        </div>
        <div className="pointer-events-none absolute right-0 top-full z-30 mt-2 w-56 translate-y-1 opacity-0 transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
            <p className="font-semibold">Match strength</p>
            <p className="opacity-80">Upgrade to Premium for exact percentages and reasons.</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
