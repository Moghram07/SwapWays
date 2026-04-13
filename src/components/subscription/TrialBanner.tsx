"use client";

import Link from "next/link";

interface TrialBannerProps {
  daysRemaining: number;
}

export function TrialBanner({ daysRemaining }: TrialBannerProps) {
  if (daysRemaining <= 0) return null;

  const isUrgent = daysRemaining <= 10;
  return (
    <div
      className={`border-b px-4 py-2 ${
        isUrgent
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-[#2668B0]/20 bg-[#E3EFF9] text-[#2668B0]"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span>{isUrgent ? "⚠️" : "🎉"}</span>
          <span className="font-medium">
            {isUrgent
              ? `Your Premium trial ends in ${daysRemaining} day${daysRemaining > 1 ? "s" : ""}`
              : `${daysRemaining} days left on your free Premium trial`}
          </span>
        </div>
        <Link href="/dashboard/upgrade" className="text-xs font-semibold hover:underline">
          Learn more →
        </Link>
      </div>
    </div>
  );
}
