"use client";

import { Trash2 } from "lucide-react";
import { formatTimeAgo } from "@/utils/dateUtils";
import { useDashboardLocale } from "@/contexts/DashboardLocaleContext";
import { getTranslator } from "@/i18n/getTranslator";

interface ConversationListItemProps {
  id: string;
  otherName: string;
  lastMessagePreview: string | null;
  lastMessageAt: string;
  unreadCount: number;
  isActive: boolean;
  isLocked?: boolean;
  onClick: () => void;
  onLockedClick?: () => void;
  onUpgradeClick?: () => void;
  onDelete?: (id: string) => void;
}

export function ConversationListItem({
  id,
  otherName,
  lastMessagePreview,
  lastMessageAt,
  unreadCount,
  isActive,
  isLocked = false,
  onClick,
  onLockedClick,
  onUpgradeClick,
  onDelete,
}: ConversationListItemProps) {
  const locale = useDashboardLocale();
  const t = getTranslator(locale);
  const initial = (otherName || "?").charAt(0).toUpperCase();
  const date = lastMessageAt ? new Date(lastMessageAt) : null;
  const timeLabel = date && !Number.isNaN(date.getTime()) ? formatTimeAgo(date) : null;

  return (
    <div className="group relative">
      <button
        type="button"
        role="option"
        aria-selected={isActive}
        onClick={() => {
          if (isLocked) {
            onLockedClick?.();
            return;
          }
          onClick();
        }}
        className={`min-h-[52px] w-full text-left px-4 py-3 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1 ${
          isLocked
            ? "opacity-80"
            : isActive
              ? "bg-[var(--primary)]/10 text-[var(--primary)]"
              : "hover:bg-slate-100"
        }`}
      >
        <div className={`flex items-start gap-3 ${isLocked ? "blur-[2px]" : ""}`}>
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
              {lastMessagePreview ?? t("dashboard.messagesEmptyPreview")}
            </p>
          </div>
          {unreadCount > 0 && (
            <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--primary)] text-white text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </button>
      {isLocked && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-white/30">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpgradeClick?.();
            }}
            className="pointer-events-auto rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
          >
            {t("dashboard.messagesUpgradeToUnlock")}
          </button>
        </div>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (typeof confirm !== "undefined" && !confirm(t("dashboard.messagesDeleteConfirm"))) return;
            onDelete(id);
          }}
          className="absolute end-2 top-8 p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-70 focus:opacity-100 focus:outline-none md:opacity-0 md:group-hover:opacity-100"
          aria-label={t("dashboard.messagesDeleteConversation")}
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
