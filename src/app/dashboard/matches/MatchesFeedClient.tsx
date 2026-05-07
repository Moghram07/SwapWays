"use client";

import Link from "next/link";
import useSWR from "swr";

type MatchItem = {
  id: string;
  matchScore?: number | null;
  status: string;
  offererId: string;
  receiverId: string;
  trade?: { destination?: string | null; departureDate?: string | null };
  offerer?: { firstName: string; lastName: string; rank?: { name?: string } };
  receiver?: { firstName: string; lastName: string; rank?: { name?: string } };
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
};

function formatDate(raw?: string | null) {
  if (!raw) return "";
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

export function MatchesFeedClient() {
  const { data, isLoading } = useSWR<{ data?: MatchItem[] }>("/api/matches", fetcher, {
    refreshInterval: () => (document.visibilityState === "visible" ? 30_000 : 0),
  });

  const matches = Array.isArray(data?.data) ? data.data : [];

  if (isLoading) {
    return <p className="py-10 text-center text-slate-500">Loading matches...</p>;
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-900">We&apos;re still learning your preferences.</h2>
        <p className="mt-2 text-sm text-slate-600">Browse the board to discover more opportunities while matches improve.</p>
        <Link href="/dashboard/board" className="mt-4 inline-block rounded-lg bg-[#2668B0] px-4 py-2 text-sm font-semibold text-white">
          Browse Swaps
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((item) => {
        const score = item.matchScore == null ? "-" : `${Math.round(item.matchScore)}%`;
        const destination = item.trade?.destination || "Swap";
        const date = formatDate(item.trade?.departureDate);
        const userName =
          item.offerer?.firstName && item.offerer?.lastName
            ? `${item.offerer.firstName} ${item.offerer.lastName}`
            : "Crew member";
        return (
          <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">{destination}</p>
              <span className="rounded-full bg-[#E3EFF9] px-2.5 py-1 text-xs font-semibold text-[#2668B0]">{score}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {userName}
              {date ? ` · ${date}` : ""}
            </p>
            <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">{item.status}</p>
          </div>
        );
      })}
    </div>
  );
}
