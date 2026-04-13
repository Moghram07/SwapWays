"use client";

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

function GenericMatchIndicator({ tier }: { tier: "low" | "medium" | "high" | "none" }) {
  if (tier === "none") return null;
  const config = {
    high: { label: "Great match", bg: "bg-[#E8F5EA]", text: "text-[#3BA34A]", dot: "bg-[#3BA34A]" },
    medium: { label: "Good match", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
    low: { label: "Low match", bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400" },
    none: { label: "", bg: "", text: "", dot: "" },
  }[tier];
  return (
    <div className="group relative inline-flex">
      <div className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${config.bg} ${config.text}`}>
        <span className={`h-2 w-2 rounded-full ${config.dot}`}></span>
        {config.label}
      </div>
      <div className="pointer-events-none absolute right-0 top-full z-30 mt-2 w-56 translate-y-1 opacity-0 transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100">
        <div className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
          <p className="font-semibold">See exact match %</p>
          <p className="opacity-80">Upgrade to Premium for detailed match percentages and breakdown.</p>
        </div>
      </div>
    </div>
  );
}

export function MatchBadge({
  percent,
  tier = "none",
  reasons,
  showTooltip = true,
  bestTripLabel,
  userTier = "PREMIUM",
}: MatchBadgeProps) {
  if (userTier === "FREE") return <GenericMatchIndicator tier={tier} />;
  if (percent == null || percent <= 0) return null;
  const color = getMatchColor(percent);
  return (
    <div className="group relative inline-flex">
      <div
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${color.bg} ${color.text}`}
      >
        {Math.round(percent)}% match
        {bestTripLabel ? <span className="text-[10px] opacity-75">· {bestTripLabel}</span> : null}
      </div>
      {showTooltip && reasons.length > 0 && (
        <div className="pointer-events-none absolute right-0 top-full z-30 mt-2 w-64 translate-y-1 opacity-0 transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
            <p className="mb-1 font-semibold">
              Why this score{bestTripLabel ? ` (${bestTripLabel})` : ""}
            </p>
            {reasons.slice(0, 4).map((reason, idx) => (
              <p key={idx} className="opacity-85">
                • {reason}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
