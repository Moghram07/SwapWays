"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { DashboardHeader } from "./DashboardHeader";
import { MobileSidebarDrawer } from "./MobileSidebarDrawer";

export function DashboardShell({ children, isAdmin }: { children: React.ReactNode; isAdmin: boolean }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const updateUnread = (r: Response) => {
      if (!r.ok) return;
      r.json()
        .then((json) => {
          const n = json?.data?.messages;
          if (typeof n === "number") setUnreadMessages(n);
        })
        .catch(() => {});
    };

    const poll = () => {
      fetch("/api/conversations/unread-count").then(updateUnread).catch(() => {});
      const nextMs = document.visibilityState === "visible" ? 60_000 : 180_000;
      timer = setTimeout(poll, nextMs);
    };

    poll();
    const onFocus = () => {
      fetch("/api/conversations/unread-count").then(updateUnread).catch(() => {});
    };

    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-[#F7F9FC]">
      <Sidebar unreadMessages={unreadMessages} isAdmin={isAdmin} />
      <div className="flex flex-1 flex-col min-h-0">
        <DashboardHeader onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-auto p-6 md:p-8">
          {children}
        </main>
      </div>
      <MobileSidebarDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        unreadMessages={unreadMessages}
        isAdmin={isAdmin}
      />
    </div>
  );
}
