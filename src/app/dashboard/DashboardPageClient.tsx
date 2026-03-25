"use client";

import Link from "next/link";
import useSWR from "swr";
import {
  Plane,
  ArrowLeftRight,
  MessageCircle,
  Plus,
  ChevronRight,
} from "lucide-react";
import { MatchList } from "@/components/match/MatchList";

const PRIMARY = "#1E6FB9";
const ACCENT = "#2DAF66";

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
};

type ProfileResponse = {
  data: {
    user: {
      id: string;
      firstName: string;
      airlineCode: string;
    };
    stats: {
      upcomingFlights: number;
      activeSwaps: number;
      unreadMessages: number;
    };
    upcomingFlights: Array<{
      id: string;
      departureDate: string;
      departureAirport: string;
      arrivalAirport: string;
      flightNumber: string;
      aircraftTypeCode: string | null;
      reportTime: string | null;
    }>;
    recentMatches: Array<{
      id: string;
      matchScore: number;
      status: string;
      offererId: string;
      receiverId: string;
      createdAt?: string;
      trade?: { destination: string | null; departureDate: string | null };
      offerer?: { firstName: string; lastName: string; rank: { name: string } };
      receiver?: { firstName: string; lastName: string; rank: { name: string } };
    }>;
    recentActivity: Array<{
      id: string;
      title: string;
      detail: string;
      createdAt: string;
      kind: "notification";
    }>;
  };
};

function formatTimeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}

export function DashboardPageClient() {
  const { data: overviewJson, isLoading } = useSWR<ProfileResponse>("/api/dashboard/overview", fetcher);

  const payload = overviewJson?.data;
  const user = payload?.user;
  const firstName = user?.firstName ?? "Crew";
  const airlineCode = user?.airlineCode ?? "SV";
  const upcomingFlights = payload?.upcomingFlights ?? [];
  const recentMatches = payload?.recentMatches ?? [];
  const recentActivity = payload?.recentActivity ?? [];

  const stats = [
    {
      label: "Upcoming Flights",
      value: `${payload?.stats.upcomingFlights ?? 0} legs`,
      icon: Plane,
      href: "/dashboard/schedule",
      color: PRIMARY,
    },
    {
      label: "Active Swaps",
      value: payload?.stats.activeSwaps ?? 0,
      icon: ArrowLeftRight,
      href: "/dashboard/matches",
      color: ACCENT,
    },
    {
      label: "Unread Messages",
      value: payload?.stats.unreadMessages ?? 0,
      icon: MessageCircle,
      href: "/dashboard/messages",
      color: PRIMARY,
    },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Welcome back, {firstName} 👋
        </h1>
        <p className="mt-2 text-slate-600">
          Here&apos;s your flight and swap overview.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href, color }) => (
          <Link
            key={label}
            href={href}
            className="group rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold tracking-tight text-slate-900">{isLoading ? "—" : value}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">{label}</p>
              </div>
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors group-hover:opacity-90"
                style={{ backgroundColor: `${color}14` }}
              >
                <Icon className="h-5 w-5" style={{ color }} strokeWidth={2} />
              </div>
            </div>
            <span className="mt-3 inline-flex items-center text-xs font-medium text-slate-500 group-hover:text-slate-700">
              View <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
        <Link
          href="/dashboard/schedule"
          className="group rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-50"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold tracking-tight text-slate-900">Upload Schedule</p>
              <p className="mt-1 text-sm text-slate-600">Import your latest roster in one click.</p>
            </div>
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors group-hover:opacity-90"
              style={{ backgroundColor: `${PRIMARY}14` }}
            >
              <Plus className="h-5 w-5" style={{ color: PRIMARY }} strokeWidth={2} />
            </div>
          </div>
          <span className="mt-3 inline-flex items-center text-xs font-medium text-slate-500 group-hover:text-slate-700">
            Open calendar <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
          </span>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Upcoming Flights</h2>
              <p className="text-xs text-slate-500">Your next scheduled flights</p>
            </div>
            <Link
              href="/dashboard/my-trades"
              className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: PRIMARY }}
            >
              My flights
            </Link>
          </div>
          <div className="p-6 pt-0">
            {!isLoading && upcomingFlights.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
                <Plane className="mx-auto h-10 w-10 text-slate-300" strokeWidth={1.5} />
                <p className="mt-3 text-sm text-slate-600">No upcoming flights</p>
                <p className="mt-1 text-xs text-slate-500">Upload your Line schedule to see your roster here</p>
                <Link
                  href="/dashboard/schedule"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-95"
                  style={{ backgroundColor: PRIMARY }}
                >
                  <Plus className="h-4 w-4" /> Upload Schedule
                </Link>
              </div>
            ) : isLoading ? (
              <ul className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <li key={i} className="h-20 animate-pulse rounded-xl border border-slate-100 bg-slate-50/70" />
                ))}
              </ul>
            ) : (
              <ul className="space-y-3">
                {upcomingFlights.map((leg) => {
                  const date = leg.departureDate ? new Date(leg.departureDate) : null;
                  const dateStr = date
                    ? date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "";
                  const flightLabel = `${airlineCode}${leg.flightNumber}`;
                  const route = `${leg.departureAirport} → ${leg.arrivalAirport}`;
                  return (
                    <li
                      key={leg.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${PRIMARY}12` }}
                        >
                          <Plane className="h-5 w-5" style={{ color: PRIMARY }} strokeWidth={2} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{route}</p>
                          <p className="text-xs text-slate-500">
                            {flightLabel}
                            {leg.aircraftTypeCode ? ` · ${leg.aircraftTypeCode}` : ""}
                            {dateStr ? ` · ${dateStr}` : ""}
                            {leg.reportTime ? ` · Report ${leg.reportTime}` : ""}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        Confirmed
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Recent Activity</h2>
              <p className="text-xs text-slate-500">Latest notifications</p>
            </div>
            <Link
              href="/dashboard/notifications"
              className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: PRIMARY }}
            >
              View all
            </Link>
          </div>
          <div className="p-6 pt-0">
            {isLoading ? (
              <ul className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <li key={i} className="h-8 animate-pulse rounded bg-slate-100" />
                ))}
              </ul>
            ) : recentActivity.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
                <MessageCircle className="mx-auto h-10 w-10 text-slate-300" strokeWidth={1.5} />
                <p className="mt-3 text-sm text-slate-600">No activity yet</p>
                <div className="mt-3 flex justify-center gap-3">
                  <Link
                    href="/dashboard/add-trade"
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    Post swap
                  </Link>
                  <Link
                    href="/dashboard/notifications"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                  >
                    Notifications
                  </Link>
                </div>
              </div>
            ) : (
              <ul className="space-y-4">
                {recentActivity.map((item) => {
                  return (
                    <li key={item.id} className="flex gap-3">
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800">{item.title}</p>
                        <p className="text-sm text-slate-600">{item.detail}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{formatTimeAgo(item.createdAt)}</p>
                      </div>
                    </li>
                  );
                })}
                {(payload?.stats.unreadMessages ?? 0) > 0 && (
                  <li className="text-xs text-slate-500">
                    You have {payload?.stats.unreadMessages ?? 0} unread message
                    {(payload?.stats.unreadMessages ?? 0) !== 1 ? "s" : ""}.
                  </li>
                )}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Recent matches</h2>
        <MatchList
          matches={recentMatches as Parameters<typeof MatchList>[0]["matches"]}
          currentUserId={user?.id ?? ""}
        />
      </section>
    </div>
  );
}
