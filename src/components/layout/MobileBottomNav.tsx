"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, MessageCircle, PlusCircle, UserRound, Zap } from "lucide-react";
import { getTranslator } from "@/i18n/getTranslator";
import type { Locale } from "@/i18n/config";

const PRIMARY = "#2668B0";

const tabs: Array<{
  href: string;
  labelKey: string;
  icon: typeof ArrowLeftRight;
  isPrimary?: boolean;
}> = [
  { href: "/dashboard/board", labelKey: "dashboard.swaps", icon: ArrowLeftRight },
  { href: "/dashboard/matches", labelKey: "dashboard.matchesTab", icon: Zap },
  { href: "/dashboard/add-trade", labelKey: "dashboard.postTab", icon: PlusCircle, isPrimary: true },
  { href: "/dashboard/messages", labelKey: "dashboard.messages", icon: MessageCircle },
  { href: "/dashboard/account", labelKey: "dashboard.accountTab", icon: UserRound },
] as const;

function isTabActive(pathname: string, href: string) {
  if (href === "/dashboard/board") return pathname === "/dashboard" || pathname.startsWith("/dashboard/board");
  return pathname.startsWith(href);
}

function badge(count: number, color: string) {
  if (count <= 0) return null;
  return (
    <span
      className="absolute -end-1 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function MobileBottomNav({
  locale,
  unreadMessages = 0,
  newMatches = 0,
}: {
  locale: Locale;
  unreadMessages?: number;
  newMatches?: number;
}) {
  const pathname = usePathname() ?? "";
  const t = getTranslator(locale);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-1 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-1.5 backdrop-blur md:hidden"
      aria-label={t("dashboard.navPrimary")}
    >
      <ul className="mx-auto flex w-full max-w-xl items-end justify-between gap-1">
        {tabs.map((tab) => {
          const active = isTabActive(pathname, tab.href);
          const Icon = tab.icon;
          const color = active ? PRIMARY : "#64748b";

          const badgeEl =
            tab.href === "/dashboard/messages"
              ? badge(unreadMessages, PRIMARY)
              : tab.href === "/dashboard/matches"
                ? badge(newMatches, "#2DAF66")
                : null;

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center justify-center rounded-xl py-1 text-[11px] font-semibold transition-colors ${
                  tab.isPrimary ? "-mt-4" : ""
                }`}
                style={{ color }}
              >
                <span
                  className={`relative flex items-center justify-center rounded-full ${
                    tab.isPrimary
                      ? "h-11 w-11 border border-[#1e5a96] bg-[#2668B0] text-white shadow-lg"
                      : active
                        ? "h-8 w-8 bg-[#E3EFF9]"
                        : "h-8 w-8"
                  }`}
                >
                  <Icon className={tab.isPrimary ? "h-5 w-5" : "h-4 w-4"} strokeWidth={2.2} />
                  {badgeEl}
                </span>
                <span className={tab.isPrimary ? "mt-1" : "mt-0.5"}>{t(tab.labelKey as never)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
