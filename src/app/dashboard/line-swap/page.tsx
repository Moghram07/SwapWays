"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LineSwapCard } from "@/components/line-swap/LineSwapCard";
import type { LineType } from "@/types/enums";

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

export default function LineSwapBoardPage() {
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Line Swap Board</h1>
          <p className="text-sm text-slate-500">Trade complete monthly lines with crew at your base.</p>
        </div>
        <Link href="/dashboard/add-trade?type=line-swap" className="rounded-xl bg-[#2668B0] px-5 py-2.5 text-sm font-medium text-white">
          Post My Line
        </Link>
      </div>

      {loading ? (
        <p className="py-10 text-center text-slate-500">Loading...</p>
      ) : posts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-12 text-center text-slate-600">
          No line swap posts yet.
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
