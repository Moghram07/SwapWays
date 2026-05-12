"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import {
  Bell,
  ArrowLeftRight,
  Plane,
  CheckCircle2,
  MessageCircle,
  AlertCircle,
} from "lucide-react";

const PRIMARY = "#1E6FB9";

type RawNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data: { conversationId?: string } | null;
  createdAt: string;
};

type LatestResponse = {
  data?: { notifications?: RawNotification[]; unreadCount?: number };
};

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function iconFor(type: string) {
  if (type === "SWAP_PROPOSED") return <ArrowLeftRight className="h-4 w-4" strokeWidth={2} />;
  if (type === "SWAP_ACCEPTED") return <CheckCircle2 className="h-4 w-4" strokeWidth={2} />;
  if (type === "MATCH_FOUND") return <Plane className="h-4 w-4" strokeWidth={2} />;
  if (type === "NEW_MESSAGE") return <MessageCircle className="h-4 w-4" strokeWidth={2} />;
  return <AlertCircle className="h-4 w-4" strokeWidth={2} />;
}

function iconStyle(type: string): { bg: string; color: string } {
  if (type === "SWAP_ACCEPTED") return { bg: "#2DAF6620", color: "#2DAF66" };
  return { bg: "#1E6FB920", color: PRIMARY };
}

function linkHref(n: RawNotification): string {
  const convId = n.data?.conversationId;
  if (convId) return `/dashboard/messages?conversation=${convId}`;
  if (n.type === "MATCH_FOUND") return "/dashboard/matches";
  return "/dashboard/notifications";
}

export function NotificationsDropdown({ ariaLabel }: { ariaLabel?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { mutate } = useSWRConfig();

  const { data } = useSWR<LatestResponse>(
    "/api/notifications/latest",
    async (url: string) => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return {};
      return res.json();
    },
    {
      refreshInterval: () =>
        typeof document !== "undefined" && document.visibilityState === "visible"
          ? 60_000
          : 180_000,
      dedupingInterval: 30_000,
      revalidateOnFocus: false,
    }
  );

  const notifications = data?.data?.notifications ?? [];
  const unreadCount = data?.data?.unreadCount ?? 0;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function handleOpen() {
    setOpen((v) => !v);
  }

  async function markAllRead() {
    await fetch("/api/notifications/latest", {
      method: "POST",
      credentials: "include",
    });
    await mutate("/api/notifications/latest");
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
        aria-label={ariaLabel ?? "Notifications"}
        type="button"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            className="absolute -end-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white"
            aria-hidden
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium transition"
                style={{ color: PRIMARY }}
                type="button"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
              <Bell className="h-8 w-8" strokeWidth={1.5} />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <li key={n.id}>
                  <Link
                    href={linkHref(n)}
                    onClick={() => setOpen(false)}
                    className={`flex gap-3 px-4 py-3 transition hover:bg-slate-50 ${
                      !n.isRead ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <span
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: iconStyle(n.type).bg,
                        color: iconStyle(n.type).color,
                      }}
                    >
                      {iconFor(n.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-slate-900">{n.title}</p>
                        {!n.isRead && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{n.message}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{formatTimeAgo(n.createdAt)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-slate-100 px-4 py-2.5 text-center">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium transition"
              style={{ color: PRIMARY }}
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
