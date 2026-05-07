"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { mutate } from "swr";
import {
  ArrowLeftRight,
  Zap,
  MessageCircle,
  UserRound,
  ArrowLeft,
  PlusCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { getTranslator } from "@/i18n/getTranslator";
import { type Locale } from "@/i18n/config";

const PRIMARY = "#1E6FB9";
const ACCENT = "#2DAF66";

const baseLinks = [
  { href: "/dashboard/board", labelKey: "dashboard.swaps", icon: ArrowLeftRight, prefetchUrls: ["/api/swap-posts/board", "/api/profile"] },
  { href: "/dashboard/matches", labelKey: "dashboard.matchesTab", icon: Zap, prefetchUrls: ["/api/matches", "/api/profile"] },
  { href: "/dashboard/add-trade", labelKey: "dashboard.postTab", icon: PlusCircle, prefetchUrls: ["/api/schedule/my-trips"] },
  { href: "/dashboard/messages", labelKey: "dashboard.messages", icon: MessageCircle, prefetchUrls: ["/api/conversations", "/api/profile"] },
  { href: "/dashboard/account", labelKey: "dashboard.accountTab", icon: UserRound, prefetchUrls: ["/api/profile"] },
];

const adminLink = {
  href: "/dashboard/admin",
  labelKey: "dashboard.admin",
  icon: ShieldCheck,
  prefetchUrls: ["/api/admin/feedback", "/api/admin/stats"],
};

type SidebarAccess = {
  tier: "FREE" | "PREMIUM";
  isTrialing: boolean;
  trialDaysRemaining: number;
} | undefined;

export function Sidebar({
  unreadMessages,
  isAdmin,
  access,
  locale,
}: {
  unreadMessages: number;
  isAdmin: boolean;
  access?: SidebarAccess;
  locale: Locale;
}) {
  void access;
  const t = getTranslator(locale);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigatingHref, setNavigatingHref] = useState<string | null>(null);
  const links = (isAdmin ? [...baseLinks, adminLink] : baseLinks).map((link) => ({
    ...link,
    label: t(link.labelKey as never),
  }));

  useEffect(() => {
    setNavigatingHref(null);
  }, [pathname, searchParams]);

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
    <aside className="hidden md:flex md:w-64 md:shrink-0 flex-col border-e border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
        <Image
          src="/images/swapways-logo.png"
          alt=""
          width={32}
          height={32}
          className="object-contain"
        />
        <span className="logo-wordmark text-sm font-bold tracking-tight">
          <span style={{ color: PRIMARY }}>Swap</span>
          <span style={{ color: ACCENT }}> Ways</span>
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        <p className="mb-3 px-3 text-start text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {t("dashboard.menu")}
        </p>
        {links.map(({ href, label, icon: Icon, prefetchUrls }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          const showUnread = href === "/dashboard/messages" && unreadMessages > 0;
          const isNavigating = navigatingHref === href;
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              onMouseEnter={() => prefetchUrls.forEach(warmCache)}
              onClick={(e) => {
                if (isActive) {
                  if (href === "/dashboard/add-trade") {
                    e.preventDefault();
                    setNavigatingHref(null);
                    window.location.assign(`/dashboard/add-trade?view=chooser&reset=${Date.now()}`);
                    return;
                  }
                  e.preventDefault();
                  setNavigatingHref(null);
                  return;
                }
                setNavigatingHref(href);
              }}
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
                    className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
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
      <div className="border-t border-slate-100 px-4 py-3">
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
          {t("dashboard.freeBetaMessage")}
        </div>
      </div>
      <div className="border-t border-slate-100 p-4">
        <Link
          href="/"
          prefetch={false}
          className="flex items-center gap-4 rounded-lg px-3 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <ArrowLeft className="h-5 w-5 shrink-0 rtl:rotate-180" strokeWidth={2} />
          {t("dashboard.backToHome")}
        </Link>
      </div>
    </aside>
  );
}
