"use client";

import { useState } from "react";
import { Moon } from "lucide-react";
import { MatchBadge } from "@/components/swap-post/MatchBadge";
import type { LineType } from "@/types/enums";

type LineSwapCardData = {
  id: string;
  lineNumber: string;
  lineType: LineType;
  month: string;
  year: number;
  daysOffStart: number;
  daysOffEnd: number;
  hasReserve: boolean;
  reserveDays: number[];
  wantDaysOffStart: number | null;
  wantDaysOffEnd: number | null;
  wantDestination: string | null;
  wantLineType: LineType | null;
  wantNoReserve: boolean;
  notes: string | null;
  matchPercent?: number;
  matchReasons?: string[];
  createdAt: string;
  layovers: { destination: string; durationHours: number; durationRaw: string }[];
  user: {
    firstName: string;
    rank: { name: string };
    base: { name: string };
  };
};

function getLineTypeBadge(type: LineType): { label: string; classes: string } {
  switch (type) {
    case "US_LINE":
      return { label: "US Line", classes: "bg-blue-100 text-blue-700" };
    case "CHINA_LINE":
      return { label: "China Line", classes: "bg-red-100 text-red-700" };
    case "RESERVE_LINE":
      return { label: "Reserve", classes: "bg-amber-100 text-amber-700" };
    case "KULN":
      return { label: "KULN", classes: "bg-violet-100 text-violet-700" };
    case "INDO":
      return { label: "INDO", classes: "bg-emerald-100 text-emerald-700" };
    case "HJLN":
      return { label: "HJLN", classes: "bg-cyan-100 text-cyan-700" };
    case "TRNG":
      return { label: "TRNG", classes: "bg-fuchsia-100 text-fuchsia-700" };
    default:
      return { label: "Normal", classes: "bg-surface-2 text-content-soft" };
  }
}

function getLineTypeLabel(type: LineType): string {
  switch (type) {
    case "US_LINE":
      return "US Line";
    case "CHINA_LINE":
      return "China Line";
    case "RESERVE_LINE":
      return "Reserve Line";
    case "KULN":
      return "KULN";
    case "INDO":
      return "INDO";
    case "HJLN":
      return "HJLN";
    case "TRNG":
      return "TRNG";
    default:
      return "Normal Line";
  }
}

function formatTimeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}

export function LineSwapCard({
  post,
  isOwner,
  onEdit,
  onCancel,
}: {
  post: LineSwapCardData;
  isOwner?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const lineTypeBadge = getLineTypeBadge(post.lineType);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue-soft text-xs font-semibold text-[#2668B0]">
            {post.user.firstName[0]}
          </div>
          <span className="text-sm font-medium text-content">
            {post.user.rank.name} · {post.user.base.name} Base
          </span>
        </div>
        <div className="flex items-center gap-2">
          {typeof post.matchPercent === "number" ? (
            <MatchBadge percent={post.matchPercent} reasons={post.matchReasons ?? []} showTooltip={false} />
          ) : null}
          <span className="text-xs text-muted">{formatTimeAgo(post.createdAt)}</span>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-base font-bold text-content">Line {post.lineNumber}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${lineTypeBadge.classes}`}>{lineTypeBadge.label}</span>
          <span className="text-sm text-muted">· {post.month} {post.year}</span>
        </div>
        {post.layovers.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {post.layovers.map((l, i) => (
              <span key={`${l.destination}-${i}`} className="inline-flex items-center gap-1 rounded-lg bg-brand-green-soft px-2.5 py-1 text-sm text-[#3BA34A]">
                <Moon className="h-3.5 w-3.5 shrink-0" />
                {l.destination} {Math.round(l.durationHours)}h
              </span>
            ))}
          </div>
        ) : (
          <p className="mb-2 text-sm italic text-faint">Reserve line - no layovers</p>
        )}
        <div className="text-sm text-muted">
          Days off: <strong>{post.daysOffStart}-{post.daysOffEnd}</strong> · {post.hasReserve ? "Has reserve" : "No reserve"}
          {post.hasReserve && post.reserveDays.length > 0 ? (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
              RR: {post.reserveDays.join(", ")}
            </span>
          ) : null}
        </div>
      </div>

      <div className="border-t border-line bg-surface-2 px-4 py-3 text-sm text-content-soft">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-faint">For</p>
        {post.wantDaysOffStart != null ? (
          <p>Days off: {post.wantDaysOffStart}-{post.wantDaysOffEnd ?? 31}</p>
        ) : null}
        {post.wantDestination ? (
          <p>Layover destination: {post.wantDestination}</p>
        ) : null}
        {post.wantLineType ? <p>Line type: {getLineTypeLabel(post.wantLineType)}</p> : null}
        {post.wantNoReserve ? <p>No reserve preferred</p> : null}
        {!post.wantDaysOffStart && !post.wantDestination && !post.wantLineType && !post.wantNoReserve ? (
          <p className="text-muted">Open to any line</p>
        ) : null}
        {post.notes ? <p className="mt-1 italic text-muted">&quot;{post.notes}&quot;</p> : null}
      </div>

      {isOwner && (
        <div className="flex items-center justify-end gap-3 border-t border-line px-4 py-2.5">
          {confirming ? (
            <>
              <span className="text-xs text-muted">Cancel this post?</span>
              <button
                type="button"
                onClick={() => { setConfirming(false); onCancel?.(); }}
                className="text-xs font-medium text-red-600 hover:text-red-800"
              >
                Yes, cancel
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-xs font-medium text-muted hover:text-content-soft"
              >
                No
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="text-xs font-medium text-[#2668B0] hover:underline"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="text-xs font-medium text-red-500 hover:text-red-700"
              >
                Cancel Post
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
