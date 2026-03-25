"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { mutate } from "swr";
import {
  LayoutDashboard,
  Plane,
  ArrowLeftRight,
  MessageCircle,
  Bell,
  User,
  ArrowLeft,
  Calendar,
  PlusCircle,
  Loader2,
  ShieldCheck,
  LifeBuoy,
} from "lucide-react";

const PRIMARY = "#1E6FB9";
const ACCENT = "#2DAF66";

const baseLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, prefetchUrls: ["/api/profile", "/api/trades?mine=1", "/api/matches", "/api/schedule/my-trips", "/api/conversations/unread-count"] },
  { href: "/dashboard/my-trades", label: "My Flights", icon: Plane, prefetchUrls: ["/api/schedule/my-trips", "/api/trades?mine=1", "/api/profile"] },
  { href: "/dashboard/add-trade", label: "Post to Trade Board", icon: PlusCircle, prefetchUrls: ["/api/schedule/my-trips"] },
  { href: "/dashboard/matches", label: "Swaps", icon: ArrowLeftRight, prefetchUrls: ["/api/matches", "/api/swap-posts?mine=1", "/api/profile"] },
  { href: "/dashboard/messages", label: "Messages", icon: MessageCircle, prefetchUrls: ["/api/conversations", "/api/profile"] },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell, prefetchUrls: [] as string[] },
  { href: "/dashboard/schedule", label: "Crew Schedule", icon: Calendar, prefetchUrls: ["/api/schedule/events"] },
  { href: "/dashboard/feedback", label: "Help & Feedback", icon: LifeBuoy, prefetchUrls: [] as string[] },
  { href: "/dashboard/profile", label: "Profile", icon: User, prefetchUrls: ["/api/profile"] },
];

const adminLink = {
  href: "/dashboard/admin",
  label: "Admin",
  icon: ShieldCheck,
  prefetchUrls: ["/api/admin/feedback", "/api/admin/stats"],
};

export function Sidebar({ unreadMessages, isAdmin }: { unreadMessages: number; isAdmin: boolean }) {
  const pathname = usePathname();
  const [navigatingHref, setNavigatingHref] = useState<string | null>(null);
  const links = isAdmin ? [...baseLinks, adminLink] : baseLinks;

  useEffect(() => {
    setNavigatingHref(null);
  }, [pathname]);

  function warmCache(url: string) {
    void mutate(
      url,
      fetch(url, { credentials: "include" })
        .then(async (r) => {
          if (!r.ok) return null;
          const contentType = r.headers.get("content-type") ?? "";
          if (!contentType.toLowerCase().includes("application/json")) return null;
          const text = await r.text();
          if (!text) return null;
          try {
            return JSON.parse(text);
          } catch {
            return null;
          }
        })
        .catch(() => null),
      { revalidate: false }
    );
  }

  return (
    <aside className="hidden md:flex md:w-64 md:shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
        <Image
          src="/images/swapways-logo.png"
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 object-contain"
          style={{ width: "auto", height: "auto" }}
        />
        <span className="text-sm font-bold tracking-tight">
          <span style={{ color: PRIMARY }}>Swap</span>
          <span style={{ color: ACCENT }}> Ways</span>
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Menu
        </p>
        {links.map(({ href, label, icon: Icon, prefetchUrls }) => {
          const isActive = pathname === href;
          const showUnread = href === "/dashboard/messages" && unreadMessages > 0;
          const isNavigating = navigatingHref === href;
          return (
            <Link
              key={label}
              href={href}
              onMouseEnter={() => prefetchUrls.forEach(warmCache)}
              onClick={() => setNavigatingHref(href)}
              className={`flex items-center gap-4 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#E3EFF9] text-[#2668B0]"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="relative shrink-0">
                {isNavigating ? (
                  <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
                ) : (
                  <Icon className="h-5 w-5" strokeWidth={2} />
                )}
                {showUnread && (
                  <span
                    className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                )}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-100 p-4">
        <Link
          href="/"
          className="flex items-center gap-4 rounded-lg px-3 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <ArrowLeft className="h-5 w-5 shrink-0" strokeWidth={2} />
          Back to Home
        </Link>
      </div>
    </aside>
  );
}
