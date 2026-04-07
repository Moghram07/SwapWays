"use client";

import Link from "next/link";
import useSWR from "swr";
import { CalendarDays, ArrowLeftRight, Bell, MessageCircle, ChevronRight } from "lucide-react";

const PRIMARY = "#1E6FB9";
const ACCENT = "#2DAF66";

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
};

type OverviewResponse = {
  data: {
    schedule: { lineNumber: string; month: number; year: number } | null;
    activeSwaps: number;
    newMatches: number;
    unreadMessages: number;
    topMatches: Array<{
      postId: string;
      matchPercent: number;
      reasons: string[];
      flightNumber: string | null;
      destination: string | null;
      tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP" | null;
      posterRank: string;
      posterBase: string;
    }>;
  };
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatScheduleBadge(schedule: OverviewResponse["data"]["schedule"]): string {
  if (!schedule) return "Upload";
  const monthLabel = MONTHS[schedule.month - 1] ?? String(schedule.month);
  return `✓ Line ${schedule.lineNumber} · ${monthLabel} ${schedule.year}`;
}

function tripTypeDotClass(tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP" | null): string {
  if (tripType === "LAYOVER") return "bg-emerald-500";
  if (tripType === "TURNAROUND") return "bg-blue-500";
  return "bg-slate-400";
}

function StatCardSkeleton() {
  return <div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />;
}

export function DashboardPageClient() {
  const { data: overviewJson, isLoading } = useSWR<OverviewResponse>("/api/dashboard/overview", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const payload = overviewJson?.data;
  const topMatches = payload?.topMatches ?? [];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <Link
              href="/dashboard/schedule"
              className="group rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold tracking-tight text-slate-900">
                    {formatScheduleBadge(payload?.schedule ?? null)}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-600">Upload Schedule</p>
                </div>
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors group-hover:opacity-90"
                  style={{ backgroundColor: `${PRIMARY}14` }}
                >
                  <CalendarDays className="h-5 w-5" style={{ color: PRIMARY }} strokeWidth={2} />
                </div>
              </div>
              <span className="mt-3 inline-flex items-center text-xs font-medium text-slate-500 group-hover:text-slate-700">
                {payload?.schedule ? "Re-upload" : "Upload"} <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
              </span>
            </Link>

            <Link
              href="/dashboard/matches"
              className="group rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold tracking-tight text-slate-900">{payload?.activeSwaps ?? 0}</p>
                  <p className="mt-1 text-sm font-medium text-slate-600">Active Swaps</p>
                </div>
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors group-hover:opacity-90"
                  style={{ backgroundColor: `${ACCENT}14` }}
                >
                  <ArrowLeftRight className="h-5 w-5" style={{ color: ACCENT }} strokeWidth={2} />
                </div>
              </div>
              <span className="mt-3 inline-flex items-center text-xs font-medium text-slate-500 group-hover:text-slate-700">
                View <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
              </span>
            </Link>

            <Link
              href="/dashboard/trade-board?sortBy=match"
              className="group rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold tracking-tight text-slate-900">{payload?.newMatches ?? 0}</p>
                  <p className="mt-1 text-sm font-medium text-slate-600">New Matches</p>
                </div>
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors group-hover:opacity-90"
                  style={{ backgroundColor: `${PRIMARY}14` }}
                >
                  <Bell className="h-5 w-5" style={{ color: PRIMARY }} strokeWidth={2} />
                </div>
              </div>
              <span className="mt-3 inline-flex items-center text-xs font-medium text-slate-500 group-hover:text-slate-700">
                View <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
              </span>
            </Link>

            <Link
              href="/dashboard/messages"
              className="group rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold tracking-tight text-slate-900">{payload?.unreadMessages ?? 0}</p>
                  <p className="mt-1 text-sm font-medium text-slate-600">Unread Msgs</p>
                </div>
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors group-hover:opacity-90"
                  style={{ backgroundColor: `${PRIMARY}14` }}
                >
                  <MessageCircle className="h-5 w-5" style={{ color: PRIMARY }} strokeWidth={2} />
                </div>
              </div>
              <span className="mt-3 inline-flex items-center text-xs font-medium text-slate-500 group-hover:text-slate-700">
                View <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
              </span>
            </Link>
          </>
        )}
      </div>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Top Matches for You</h2>
        {isLoading ? (
          <ul className="space-y-3">
            {[1, 2, 3].map((i) => (
              <li key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </ul>
        ) : topMatches.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center text-sm text-slate-600">
            No matches yet. Post a swap or upload your schedule to find matches.
          </p>
        ) : (
          <ul className="space-y-2">
            {topMatches.map((match) => {
              const flightLabel = match.flightNumber ? `SV${match.flightNumber}` : "Flight";
              const destination = match.destination ?? "—";
              const tripLabel = match.tripType ? match.tripType.toLowerCase() : "trip";
              return (
                <li key={match.postId}>
                  <Link
                    href="/dashboard/trade-board?sortBy=match"
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${tripTypeDotClass(match.tripType)}`} />
                        {Math.round(match.matchPercent)}% match · {flightLabel} {destination} {tripLabel} · {match.posterRank} · {match.posterBase}
                      </p>
                    </div>
                    <span className="ml-4 shrink-0 text-xs font-medium text-slate-600">
                      View <ChevronRight className="inline h-3.5 w-3.5" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
