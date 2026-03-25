"use client";

interface MatchBadgeProps {
  percent: number;
  reasons: string[];
  showTooltip?: boolean;
}

function getMatchColor(percent: number): { bg: string; text: string } {
  if (percent >= 80) return { bg: "bg-green-100", text: "text-green-800" };
  if (percent >= 60) return { bg: "bg-[#E8F5EA]", text: "text-[#3BA34A]" };
  if (percent >= 40) return { bg: "bg-yellow-100", text: "text-yellow-800" };
  if (percent >= 20) return { bg: "bg-orange-100", text: "text-orange-800" };
  return { bg: "bg-gray-100", text: "text-gray-600" };
}

export function MatchBadge({ percent, reasons, showTooltip = true }: MatchBadgeProps) {
  const color = getMatchColor(percent);
  return (
    <div className="group relative inline-flex">
      <div
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${color.bg} ${color.text}`}
      >
        {Math.round(percent)}% match
      </div>
      {showTooltip && reasons.length > 0 && (
        <div className="pointer-events-none absolute right-0 top-full z-30 mt-2 w-64 translate-y-1 opacity-0 transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
            <p className="mb-1 font-semibold">Why this score</p>
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
