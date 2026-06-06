"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useDashboardLocale } from "@/contexts/DashboardLocaleContext";
import { getTranslator } from "@/i18n/getTranslator";

const STORAGE_KEY = "installBannerDismissed";
const HIDE_FOR_MS = 7 * 24 * 60 * 60 * 1000;

export function InstallAppBanner() {
  const pathname = usePathname() ?? "";
  const locale = useDashboardLocale();
  const t = getTranslator(locale);
  const [ready, setReady] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissedUntil, setDismissedUntil] = useState<number>(0);
  const [nowTs, setNowTs] = useState<number>(0);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const value = raw ? Number(raw) : 0;
    setDismissedUntil(Number.isFinite(value) ? value : 0);
    setNowTs(Date.now());
    setReady(true);
  }, []);

  const hidden = useMemo(() => {
    if (!ready) return true;
    if (isStandalone) return true;
    if (nowTs < dismissedUntil) return true;
    if (!pathname.startsWith("/dashboard")) return true;
    return false;
  }, [ready, isStandalone, dismissedUntil, nowTs, pathname]);

  if (hidden) return null;

  function dismissForAWeek() {
    const until = Date.now() + HIDE_FOR_MS;
    window.localStorage.setItem(STORAGE_KEY, String(until));
    setDismissedUntil(until);
    setNowTs(Date.now());
  }

  return (
    <div className="border-b border-[#2668B0]/15 bg-brand-blue-soft px-3 py-2 text-sm text-content">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 font-medium leading-snug sm:truncate">{t("dashboard.installBannerBody")}</p>
        <div className="flex shrink-0 items-center gap-2 text-xs sm:text-sm">
          <Link href="/dashboard/install" className="rounded-md bg-[#2668B0] px-2.5 py-1 font-semibold text-white">
            {t("dashboard.installBannerShowMe")}
          </Link>
          <button
            type="button"
            onClick={dismissForAWeek}
            className="rounded-md border border-[#2668B0]/25 px-2 py-1 font-semibold text-[#2668B0]"
            aria-label={t("dashboard.installBannerDismissAria")}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
