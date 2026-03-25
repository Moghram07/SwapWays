"use client";

import Link from "next/link";
import Image from "next/image";
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
} from "lucide-react";

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
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

const adminLink = { href: "/dashboard/admin", label: "Admin", icon: ShieldCheck };

interface MobileSidebarDrawerProps {
  open: boolean;
  onClose: () => void;
  unreadMessages?: number;
  isAdmin?: boolean;
}

export function MobileSidebarDrawer({ open, onClose, unreadMessages = 0, isAdmin = false }: MobileSidebarDrawerProps) {
  const pathname = usePathname();
  const links = isAdmin ? [...baseLinks, adminLink] : baseLinks;

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
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Menu
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
        <div className="border-t border-slate-100 p-4">
          <Link
            href="/4"
            onClick={onClose}
            className="flex min-h-[44px] items-center gap-4 rounded-lg px-3 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" strokeWidth={2} />
            Back to Home
          </Link>
        </div>
      </aside>
    </>
  );
}
