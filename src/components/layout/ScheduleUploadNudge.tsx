"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useUserAccess } from "@/hooks/useUserAccess";

const STORAGE_KEY = "scheduleUploadNudgeDismissed";
const HIDE_FOR_MS = 7 * 24 * 60 * 60 * 1000;

export function ScheduleUploadNudge() {
  const pathname = usePathname() ?? "";
  const { access } = useUserAccess();
  const [ready, setReady] = useState(false);
  const [dismissedUntil, setDismissedUntil] = useState<number>(0);
  const [nowTs, setNowTs] = useState<number>(0);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const value = raw ? Number(raw) : 0;
    setDismissedUntil(Number.isFinite(value) ? value : 0);
    setNowTs(Date.now());
    setReady(true);
  }, []);

  const onTargetPage = useMemo(() => {
    if (pathname === "/dashboard/board" || pathname === "/dashboard") return true;
    if (pathname.startsWith("/dashboard/add-trade")) return true;
    return false;
  }, [pathname]);

  const hidden = useMemo(() => {
    if (!ready) return true;
    if (!access?.canUploadSchedule) return true;
    if (access.hasUploadedSchedule) return true;
    if (!onTargetPage) return true;
    if (nowTs < dismissedUntil) return true;
    return false;
  }, [ready, access, onTargetPage, dismissedUntil, nowTs]);

  if (hidden) return null;

  function dismissForAWeek() {
    const until = Date.now() + HIDE_FOR_MS;
    window.localStorage.setItem(STORAGE_KEY, String(until));
    setDismissedUntil(until);
    setNowTs(Date.now());
  }

  return (
    <div className="border-b border-emerald-600/15 bg-brand-green-soft px-3 py-2 text-sm text-content">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
        <p className="min-w-0 font-medium">
          Upload your PDF line schedule to post swaps from your trips in one tap.
        </p>
        <div className="flex shrink-0 items-center gap-2 text-xs sm:text-sm">
          <Link
            href="/dashboard/schedule"
            className="rounded-md bg-emerald-700 px-2.5 py-1 font-semibold text-white hover:bg-emerald-800"
          >
            Upload
          </Link>
          <button
            type="button"
            onClick={dismissForAWeek}
            className="rounded-md border border-emerald-700/30 px-2 py-1 font-semibold text-emerald-900"
            aria-label="Dismiss schedule reminder"
          >
            x
          </button>
        </div>
      </div>
    </div>
  );
}
