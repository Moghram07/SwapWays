"use client";

import { signOut, useSession } from "next-auth/react";
import { Menu } from "lucide-react";
import { getTranslator } from "@/i18n/getTranslator";
import { type Locale } from "@/i18n/config";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";

const PRIMARY = "#1E6FB9";

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

interface DashboardHeaderProps {
  onMenuClick?: () => void;
  locale: Locale;
}

export function DashboardHeader({ onMenuClick, locale }: DashboardHeaderProps) {
  const { data: session, status } = useSession();
  const t = getTranslator(locale);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-10 w-10 min-w-[2.5rem] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:hidden"
          aria-label={t("nav.openMenu")}
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
        <span className="text-base font-semibold text-slate-800">{t("dashboard.headerTitle")}</span>
      </div>
      <div className="flex items-center gap-3">
        <LanguageToggle
          mode="cookie-only"
          currentLocale={locale}
          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        />
        {status === "loading" ? (
          <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />
        ) : session ? (
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              {getInitials(session.user?.name ?? null, session.user?.email ?? null)}
            </span>
            <span className="hidden text-sm font-medium text-slate-700 sm:block">
              {session.user?.name ?? session.user?.email}
            </span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              {t("dashboard.signOut")}
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
