"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [myPosts, setMyPosts] = useState<LineSwapPostRecord[]>([]);
  const [posts, setPosts] = useState<LineSwapPostRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/line-swap?mine=1&status=OPEN").then((r) => r.json()).then((json) => Array.isArray(json.data) ? json.data : []).catch(() => []),
      fetch("/api/line-swap/board").then((r) => r.json()).then((json) => Array.isArray(json.data) ? json.data : []).catch(() => []),
    ]).then(([mine, board]) => {
      setMyPosts(mine);
      setPosts(board);
    }).finally(() => setLoading(false));
  }, []);

  function handleEdit(id: string) {
    router.push(`/dashboard/add-trade?type=line-swap&edit=${id}`);
  }

  async function handleCancel(id: string) {
    const res = await fetch(`/api/line-swap/${id}`, { method: "DELETE" });
    if (res.ok) setMyPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-6">
      {!compactHeader && <h1 className="text-2xl font-bold text-slate-900">{t("dashboard.lineSwapBoardTitle")}</h1>}

      {loading ? (
        <p className="py-8 text-center text-slate-500">{t("dashboard.loading")}</p>
      ) : (
        <>
          {myPosts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t("dashboard.lineSwapMyPosts")}</h2>
              {myPosts.map((post) => (
                <LineSwapCard
                  key={post.id}
                  post={post}
                  isOwner
                  onEdit={() => handleEdit(post.id)}
                  onCancel={() => handleCancel(post.id)}
                />
              ))}
            </div>
          )}

          <div className="space-y-3">
            {!compactHeader && myPosts.length > 0 && (
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t("dashboard.lineSwapOtherPosts")}</h2>
            )}
            {posts.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-10 text-center text-slate-600">
                {t("dashboard.noLineSwapPostsYet")}
              </p>
            ) : (
              posts.map((post) => (
                <LineSwapCard key={post.id} post={post} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
