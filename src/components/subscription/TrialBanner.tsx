"use client";

import Link from "next/link";
import { type Locale } from "@/i18n/config";
import { getTranslator } from "@/i18n/getTranslator";

interface TrialBannerProps {
  daysRemaining: number;
  locale: Locale;
}

export function TrialBanner({ daysRemaining, locale }: TrialBannerProps) {
  if (daysRemaining <= 0) return null;
  const t = getTranslator(locale);

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
              ? locale === "ar"
                ? `${t("dashboard.trialUrgentPrefix")} ${daysRemaining} ${daysRemaining > 1 ? "أيام" : "يوم"}`
                : `${t("dashboard.trialUrgentPrefix")} ${daysRemaining} day${daysRemaining > 1 ? "s" : ""}`
              : locale === "ar"
                ? `${daysRemaining} ${t("dashboard.trialNormalSuffix")}`
                : `${daysRemaining} ${t("dashboard.trialNormalSuffix")}`}
          </span>
        </div>
        <Link href="/dashboard/upgrade" className="text-xs font-semibold hover:underline">
          {t("dashboard.learnMore")} →
        </Link>
      </div>
    </div>
  );
}
