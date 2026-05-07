"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell } from "lucide-react";
import { type Locale } from "@/i18n/config";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { getTranslator } from "@/i18n/getTranslator";

const PRIMARY = "#1E6FB9";

interface DashboardHeaderProps {
  unreadMessages?: number;
  locale: Locale;
}

export function DashboardHeader({ unreadMessages = 0, locale }: DashboardHeaderProps) {
  const t = getTranslator(locale);
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/board" className="flex items-center gap-2">
          <Image src="/images/swapways-logo.png" alt="" width={28} height={28} className="object-contain" />
          <span className="logo-wordmark text-base font-bold tracking-tight">
            <span style={{ color: PRIMARY }}>Swap</span>
            <span style={{ color: "#2DAF66" }}> Ways</span>
          </span>
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/notifications"
          className="relative rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
          aria-label={t("dashboard.notificationsLabel")}
        >
          <Bell className="h-4 w-4" />
          {unreadMessages > 0 && (
            <span className="absolute -end-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500" />
          )}
        </Link>
        <LanguageToggle
          mode="cookie-only"
          currentLocale={locale}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        />
      </div>
    </header>
  );
}
