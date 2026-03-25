"use client";

const CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  posted: {
    label: "Swap Posted",
    className: "border-[#2668B0]/20 bg-[#E3EFF9] text-[#2668B0]",
  },
  matched: {
    label: "Match Found",
    className: "border-[#3BA34A]/20 bg-[#E8F5EA] text-[#3BA34A]",
  },
  accepted: {
    label: "Swap Accepted",
    className: "border-purple-200 bg-purple-50 text-purple-700",
  },
  completed: {
    label: "Swap Complete",
    className: "border-gray-200 bg-gray-100 text-gray-600",
  },
};

type StatusKey = keyof typeof CONFIG;

interface SwapStatusBadgeProps {
  status: StatusKey;
}

export function SwapStatusBadge({ status }: SwapStatusBadgeProps) {
  const { label, className } = CONFIG[status] ?? CONFIG.completed;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
