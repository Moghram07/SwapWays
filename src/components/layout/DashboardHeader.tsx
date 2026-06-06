"use client";

import Image from "next/image";
import Link from "next/link";
import { type Locale } from "@/i18n/config";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getTranslator } from "@/i18n/getTranslator";
import { NotificationsDropdown } from "./NotificationsDropdown";

const PRIMARY = "#1E6FB9";

interface DashboardHeaderProps {
  unreadMessages?: number;
  locale: Locale;
}

export function DashboardHeader({ locale }: DashboardHeaderProps) {
  const t = getTranslator(locale);
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-4 sm:px-5">
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
        <NotificationsDropdown ariaLabel={t("dashboard.notificationsLabel")} />
        <ThemeToggle locale={locale} />
        <LanguageToggle
          mode="cookie-only"
          currentLocale={locale}
          className="rounded-lg border border-line px-2 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-content"
        />
      </div>
    </header>
  );
}
