"use client";

import { Trash2 } from "lucide-react";
import { formatTimeAgo } from "@/utils/dateUtils";

interface ConversationListItemProps {
  id: string;
  otherName: string;
  lastMessagePreview: string | null;
  lastMessageAt: string;
  unreadCount: number;
  isActive: boolean;
  onClick: () => void;
  onDelete?: (id: string) => void;
}

export function ConversationListItem({
  id,
  otherName,
  lastMessagePreview,
  lastMessageAt,
  unreadCount,
  isActive,
  onClick,
  onDelete,
}: ConversationListItemProps) {
  const initial = (otherName || "?").charAt(0).toUpperCase();
  const date = lastMessageAt ? new Date(lastMessageAt) : null;
  const timeLabel = date && !Number.isNaN(date.getTime()) ? formatTimeAgo(date) : null;

  return (
    <div className="group relative">
      <button
        type="button"
        role="option"
        aria-selected={isActive}
        onClick={onClick}
        className={`min-h-[52px] w-full text-left px-4 py-3 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1 ${
          isActive ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "hover:bg-slate-100"
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className="shrink-0 w-9 h-9 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center text-sm font-semibold"
            aria-hidden
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-medium text-slate-900 truncate">{otherName}</p>
              {timeLabel && (
                <span className="shrink-0 text-xs text-slate-500">{timeLabel}</span>
              )}
            </div>
            <p className="text-sm text-slate-500 truncate mt-0.5">
              {lastMessagePreview ?? "No messages yet"}
            </p>
          </div>
          {unreadCount > 0 && (
            <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--primary)] text-white text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (typeof confirm !== "undefined" && !confirm("Delete this conversation?")) return;
            onDelete(id);
          }}
          className="absolute right-2 top-8 p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-70 focus:opacity-100 focus:outline-none md:opacity-0 md:group-hover:opacity-100"
          aria-label="Delete conversation"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
