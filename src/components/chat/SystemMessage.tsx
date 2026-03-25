"use client";

import type { MessageWithSender } from "@/hooks/useMessages";

const SYSTEM_STYLES: Record<string, { icon: string; color: string }> = {
  SWAP_PROPOSED: { icon: "Proposed swap", color: "text-[#3BA34A] bg-[#E8F5EA]" },
  SWAP_ACCEPTED: { icon: "Swap accepted", color: "text-[#3BA34A] bg-[#E8F5EA]" },
  SWAP_DECLINED: { icon: "Swap declined", color: "text-red-600 bg-red-50" },
  TRIP_OFFERED: { icon: "Trip offered", color: "text-[#1E6FB9] bg-[#E3EFF9]" },
  TRIP_CHANGED: { icon: "Trip changed", color: "text-amber-600 bg-amber-50" },
};

export function SystemMessage({ message }: { message: MessageWithSender }) {
  const config = (message.systemAction && SYSTEM_STYLES[message.systemAction]) || {
    icon: "",
    color: "text-slate-500 bg-slate-50",
  };

  return (
    <div className="flex justify-center my-4">
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.icon && <span>{config.icon}</span>}
        {message.content}
      </span>
    </div>
  );
}
