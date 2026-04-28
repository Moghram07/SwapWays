"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  X,
  ShieldCheck,
  LifeBuoy,
  Smartphone,
} from "lucide-react";
import { getTranslator } from "@/i18n/getTranslator";
import { type Locale } from "@/i18n/config";

const PRIMARY = "#1E6FB9";
const ACCENT = "#2DAF66";

const baseLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/my-trades", label: "My Flights", icon: Plane },
  { href: "/dashboard/add-trade", label: "Post to Trade Board", icon: PlusCircle },
  { href: "/dashboard/matches", label: "Swaps", icon: ArrowLeftRight },
  { href: "/dashboard/messages", label: "Messages", icon: MessageCircle },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/schedule", label: "Crew Schedule", icon: Calendar },
  { href: "/dashboard/feedback", label: "Help & Feedback", icon: LifeBuoy },
  { href: "/dashboard/install", label: "Install App", icon: Smartphone },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

const adminLink = { href: "/dashboard/admin", label: "Admin", icon: ShieldCheck };

interface MobileSidebarDrawerProps {
  open: boolean;
  onClose: () => void;
  unreadMessages?: number;
  isAdmin?: boolean;
  access?: {
    tier: "FREE" | "PREMIUM";
    isTrialing: boolean;
    trialDaysRemaining: number;
  };
  locale: Locale;
}

export function MobileSidebarDrawer({
  open,
  onClose,
  unreadMessages = 0,
  isAdmin = false,
  access,
  locale,
}: MobileSidebarDrawerProps) {
  const t = getTranslator(locale);
  const pathname = usePathname();
  const links = (isAdmin ? [...baseLinks, adminLink] : baseLinks).map((link) => ({
    ...link,
    label:
      link.href === "/dashboard"
        ? t("dashboard.overview")
        : link.href === "/dashboard/my-trades"
          ? t("dashboard.myFlights")
          : link.href === "/dashboard/add-trade"
            ? t("dashboard.postToTradeBoard")
            : link.href === "/dashboard/matches"
              ? t("dashboard.swaps")
              : link.href === "/dashboard/messages"
                ? t("dashboard.messages")
                : link.href === "/dashboard/notifications"
                  ? t("dashboard.notifications")
                  : link.href === "/dashboard/schedule"
                    ? t("dashboard.crewSchedule")
                    : link.href === "/dashboard/feedback"
                      ? t("dashboard.helpAndFeedback")
                      : link.href === "/dashboard/install"
                        ? t("dashboard.installApp")
                        : link.href === "/dashboard/profile"
                          ? t("dashboard.profile")
                          : link.href === "/dashboard/admin"
                            ? t("dashboard.admin")
                            : link.label,
  }));

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        aria-hidden
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col border-r border-slate-200 bg-white shadow-xl md:hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/images/swapways-logo.png"
              alt=""
              width={32}
              height={32}
              className="object-contain"
            />
            <span className="text-sm font-bold tracking-tight">
              <span style={{ color: PRIMARY }}>Swap</span>
              <span style={{ color: ACCENT }}> Ways</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label={t("nav.closeMenu")}
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {t("dashboard.menu")}
          </p>
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            const showUnread = href === "/dashboard/messages" && unreadMessages > 0;
            return (
              <Link
                key={label}
                href={href}
                onClick={onClose}
                className={`flex min-h-[44px] items-center gap-4 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#E3EFF9] text-[#2668B0]"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className="relative shrink-0">
                  <Icon className="h-5 w-5" strokeWidth={2} />
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
        <div className="border-t border-slate-100 px-4 py-3">
          {access?.tier === "PREMIUM" ? (
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold text-slate-900">⭐ {t("dashboard.premium")}</p>
              {access.isTrialing ? (
                <p className="text-[10px] text-slate-500">{access.trialDaysRemaining}{locale === "ar" ? " " : ""}{t("dashboard.trialDaysLeftShort")}</p>
              ) : null}
            </div>
          ) : (
            <Link
              href="/dashboard/upgrade"
              onClick={onClose}
              className="block w-full rounded-lg bg-gradient-to-r from-[#2668B0] to-[#3BA34A] px-3 py-2 text-center text-xs font-semibold text-white"
            >
              ⭐ {t("dashboard.upgradeToPremium")}
            </Link>
          )}
        </div>
        <div className="border-t border-slate-100 p-4">
          <Link
            href="/"
            onClick={onClose}
            className="flex min-h-[44px] items-center gap-4 rounded-lg px-3 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" strokeWidth={2} />
            {t("dashboard.backToHome")}
          </Link>
        </div>
      </aside>
    </>
  );
}
