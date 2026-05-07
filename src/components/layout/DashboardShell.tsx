"use client";

import useSWR from "swr";
import { Sidebar } from "./Sidebar";
import { DashboardHeader } from "./DashboardHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { InstallAppBanner } from "./InstallAppBanner";
import { ScheduleUploadNudge } from "./ScheduleUploadNudge";
import { useUserAccess } from "@/hooks/useUserAccess";
import { getDirection, type Locale } from "@/i18n/config";
import { DashboardLocaleProvider } from "@/contexts/DashboardLocaleContext";

export function DashboardShell({
  children,
  isAdmin,
  locale,
}: {
  children: React.ReactNode;
  isAdmin: boolean;
  locale: Locale;
}) {
  const { access } = useUserAccess();
  const { data: unreadJson } = useSWR<{ data?: { messages?: number } }>(
    "/api/conversations/unread-count",
    async (url: string) => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return {};
      return res.json();
    },
    {
      refreshInterval: () =>
        typeof document !== "undefined" && document.visibilityState === "visible" ? 60_000 : 180_000,
      dedupingInterval: 30_000,
      /** Interval already refreshes; avoid duplicate refetch on every tab focus. */
      revalidateOnFocus: false,
    }
  );
  const unreadMessages = unreadJson?.data?.messages ?? 0;

  return (
    <DashboardLocaleProvider locale={locale}>
      <div
        lang={locale}
        dir={getDirection(locale)}
        className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-[#F7F9FC]"
      >
        <Sidebar unreadMessages={unreadMessages} isAdmin={isAdmin} access={access} locale={locale} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <DashboardHeader unreadMessages={unreadMessages} locale={locale} />
          <InstallAppBanner />
          <ScheduleUploadNudge />
          <main className="flex-1 max-w-full overflow-y-auto overflow-x-hidden px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6">
            {children}
          </main>
          <MobileBottomNav locale={locale} />
        </div>
      </div>
    </DashboardLocaleProvider>
  );
}
