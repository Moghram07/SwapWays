"use client";

import { Bell } from "lucide-react";

export type Announcement = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
};

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function AnnouncementsWindow({ items }: { items: Announcement[] }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)]/20 text-[var(--primary)]">
          <Bell className="h-4 w-4" />
        </span>
        <span className="font-semibold text-content">Announcements</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-faint">
            <Bell className="h-10 w-10" strokeWidth={1.5} />
            <p className="text-sm">No announcements yet.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-3">
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/20 text-[var(--primary)]">
                  <Bell className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-surface-2 px-4 py-3">
                  <p className="text-sm font-semibold text-content">{item.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-content-soft">{item.message}</p>
                  <p className="mt-2 text-xs text-faint">{formatTimeAgo(item.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
