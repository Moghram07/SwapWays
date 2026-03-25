"use client";

import useSWR from "swr";
import { MatchesClient } from "./MatchesClient";

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
};

type MatchesResponse = {
  data?: Array<{
    id: string;
    matchScore: number;
    status: string;
    offererId: string;
    receiverId: string;
    trade: { destination: string | null; departureDate: string | null };
    offerer?: { firstName: string; lastName: string; rank: { name: string } };
    receiver?: { firstName: string; lastName: string; rank: { name: string } };
  }>;
};

type ProfileResponse = {
  data?: { id?: string };
};

export function MatchesPageClient() {
  const { data: profileJson } = useSWR<ProfileResponse>("/api/profile", fetcher);
  const { data: matchesJson, isLoading } = useSWR<MatchesResponse>("/api/matches", fetcher);

  const currentUserId = profileJson?.data?.id ?? "";
  const initialMatches = (matchesJson?.data ?? []).map((m) => ({
    ...m,
    trade: {
      ...m.trade,
      departureDate: m.trade?.departureDate ? new Date(m.trade.departureDate) : null,
    },
  }));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
      </div>
    );
  }

  return <MatchesClient initialMatches={initialMatches} currentUserId={currentUserId} />;
}
