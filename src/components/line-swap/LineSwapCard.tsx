"use client";

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
    default:
      return { label: "Normal", classes: "bg-slate-100 text-slate-700" };
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

export function LineSwapCard({ post }: { post: LineSwapCardData }) {
  const lineTypeBadge = getLineTypeBadge(post.lineType);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E3EFF9] text-xs font-semibold text-[#2668B0]">
            {post.user.firstName[0]}
          </div>
          <span className="text-sm font-medium text-slate-900">
            {post.user.rank.name} · {post.user.base.name} Base
          </span>
        </div>
        <div className="flex items-center gap-2">
          {typeof post.matchPercent === "number" ? (
            <MatchBadge percent={post.matchPercent} reasons={post.matchReasons ?? []} showTooltip={false} />
          ) : null}
          <span className="text-xs text-slate-500">{formatTimeAgo(post.createdAt)}</span>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-base font-bold text-slate-900">Line {post.lineNumber}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${lineTypeBadge.classes}`}>{lineTypeBadge.label}</span>
          <span className="text-sm text-slate-500">· {post.month} {post.year}</span>
        </div>
        {post.layovers.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {post.layovers.map((l, i) => (
              <span key={`${l.destination}-${i}`} className="rounded-lg bg-[#E8F5EA] px-2.5 py-1 text-sm text-[#3BA34A]">
                {l.destination} {Math.round(l.durationHours)}h
              </span>
            ))}
          </div>
        ) : (
          <p className="mb-2 text-sm italic text-slate-400">Reserve line - no layovers</p>
        )}
        <div className="text-sm text-slate-600">
          Days off: <strong>{post.daysOffStart}-{post.daysOffEnd}</strong> · {post.hasReserve ? "Has reserve" : "No reserve"}
          {post.hasReserve && post.reserveDays.length > 0 ? (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
              RR: {post.reserveDays.join(", ")}
            </span>
          ) : null}
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Wants</p>
        {post.wantDaysOffStart != null ? (
          <p>Days off: {post.wantDaysOffStart}-{post.wantDaysOffEnd ?? 31}</p>
        ) : null}
        {post.wantDestination ? (
          <p>Layover destination: {post.wantDestination}</p>
        ) : null}
        {post.wantLineType ? <p>Line type: {getLineTypeLabel(post.wantLineType)}</p> : null}
        {post.wantNoReserve ? <p>No reserve preferred</p> : null}
        {!post.wantDaysOffStart && !post.wantDestination && !post.wantLineType && !post.wantNoReserve ? (
          <p className="text-slate-500">Open to any line</p>
        ) : null}
        {post.notes ? <p className="mt-1 italic text-slate-600">&quot;{post.notes}&quot;</p> : null}
      </div>
    </div>
  );
}
