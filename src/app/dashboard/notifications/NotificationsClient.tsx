"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight,
  Plane,
  AlertCircle,
  CheckCircle2,
  Bell,
  MessageCircle,
} from "lucide-react";

const PRIMARY = "#1E6FB9";
const ACCENT = "#2DAF66";

export type NotificationItem = {
  id: string;
  type: "swap_accepted" | "new_match" | "schedule_change" | "swap_proposal" | "compliance" | "roster" | "new_message";
  title: string;
  detail: string;
  timeAgo: string;
  unread: boolean;
  icon: "swap" | "plane" | "alert" | "check" | "bell" | "message";
  iconBg: string;
  iconColor: string;
  conversationId?: string;
};

export function NotificationsClient({
  initialNotifications,
}: {
  initialNotifications: NotificationItem[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter((n) => n.unread).length;

  function markAllAsRead() {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, unread: false }))
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Notifications</h1>
          <p className="mt-2 text-slate-600">
            {unreadCount === 0
              ? "No unread notifications"
              : `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead} className="shrink-0">
            Mark all as read
          </Button>
        )}
      </div>

      <ul className="space-y-3">
        {notifications.map((n) => {
          const content = (
            <div className="flex gap-4 p-4">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: n.iconBg, color: n.iconColor }}
              >
                {n.icon === "swap" && <ArrowLeftRight className="h-5 w-5" strokeWidth={2} />}
                {n.icon === "plane" && <Plane className="h-5 w-5" strokeWidth={2} />}
                {n.icon === "alert" && <AlertCircle className="h-5 w-5" strokeWidth={2} />}
                {n.icon === "check" && <CheckCircle2 className="h-5 w-5" strokeWidth={2} />}
                {n.icon === "bell" && <Bell className="h-5 w-5" strokeWidth={2} />}
                {n.icon === "message" && <MessageCircle className="h-5 w-5" strokeWidth={2} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">{n.title}</span>
                  {n.unread && (
                    <span
                      className="rounded px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: PRIMARY }}
                    >
                      New
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-slate-600">{n.detail}</p>
                <p className="mt-1 text-xs text-slate-500">{n.timeAgo}</p>
              </div>
            </div>
          );
          return (
            <li
              key={n.id}
              className={`rounded-xl border bg-white shadow-sm transition-shadow ${
                n.unread ? "border-l-4 border-l-[#1E6FB9]" : "border-slate-200"
              }`}
            >
              {n.conversationId ? (
                <Link href={`/dashboard/messages?conversation=${n.conversationId}`} className="block">
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>

      {notifications.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Bell className="mx-auto h-12 w-12 text-slate-300" strokeWidth={1.5} />
          <p className="mt-3 text-slate-600">No notifications yet.</p>
        </div>
      )}
    </div>
  );
}
