"use client";

import { useState } from "react";
import useSWR from "swr";
import { Sidebar } from "./Sidebar";
import { DashboardHeader } from "./DashboardHeader";
import { MobileSidebarDrawer } from "./MobileSidebarDrawer";
import { useUserAccess } from "@/hooks/useUserAccess";
import { TrialBanner } from "@/components/subscription/TrialBanner";
import { getDirection, type Locale } from "@/i18n/config";

export function DashboardShell({
  children,
  isAdmin,
  locale,
}: {
  children: React.ReactNode;
  isAdmin: boolean;
  locale: Locale;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { access } = useUserAccess();
  const { data: unreadJson } = useSWR<{ data?: { messages?: number } }>(
    "/api/conversations/unread-count",
    async (url: string) => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return {};
      return res.json();
    },
    {
      refreshInterval: () => (typeof document !== "undefined" && document.visibilityState === "visible" ? 60_000 : 180_000),
      dedupingInterval: 15_000,
      revalidateOnFocus: true,
    }
  );
  const unreadMessages = unreadJson?.data?.messages ?? 0;

  return (
    <div lang={locale} dir={getDirection(locale)} className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-[#F7F9FC]">
      <Sidebar unreadMessages={unreadMessages} isAdmin={isAdmin} access={access} locale={locale} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TrialBanner daysRemaining={access?.isTrialing ? access.trialDaysRemaining : 0} locale={locale} />
        <DashboardHeader onMenuClick={() => setMobileMenuOpen(true)} locale={locale} />
        <main className="flex-1 max-w-full overflow-y-auto overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
      <MobileSidebarDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        unreadMessages={unreadMessages}
        isAdmin={isAdmin}
        access={access}
        locale={locale}
      />
    </div>
  );
}
