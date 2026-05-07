"use client";

import { useEffect, useState } from "react";
import { LineSwapCard } from "@/components/line-swap/LineSwapCard";
import type { LineType } from "@/types/enums";
import { getTranslator } from "@/i18n/getTranslator";
import type { Locale } from "@/i18n/config";

interface LineSwapPostRecord {
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
}

export function LineSwapBoardSection({
  compactHeader = false,
  locale,
}: {
  compactHeader?: boolean;
  locale: Locale;
}) {
  const t = getTranslator(locale);
  const [posts, setPosts] = useState<LineSwapPostRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/line-swap/board")
      .then((r) => r.json())
      .then((json) => setPosts(Array.isArray(json.data) ? json.data : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        {!compactHeader && <h1 className="text-2xl font-bold text-slate-900">{t("dashboard.lineSwapBoardTitle")}</h1>}
      </div>

      {loading ? (
        <p className="py-8 text-center text-slate-500">{t("dashboard.loading")}</p>
      ) : posts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-10 text-center text-slate-600">
          {t("dashboard.noLineSwapPostsYet")}
        </p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <LineSwapCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
