"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type FeedbackItem = {
  id: string;
  type: "REQUEST" | "QUESTION" | "SUGGESTION";
  status: "OPEN" | "IN_PROGRESS" | "CLOSED";
  priority: "LOW" | "NORMAL" | "HIGH";
  subject: string | null;
  message: string;
  adminNote: string | null;
  createdAt: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
};

type AdminStatsOverview = {
  newUsersThisWeek: number;
  premiumUsers: number;
  premiumPercent: number;
  trialingUsers: number;
  trialsExpiringThisWeek: number;
  openSwapPosts: number;
  openLineSwapPosts: number;
  activeConversations: number;
  recentSignups: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: string;
    tier: string;
    subscriptionStatus: string;
    rank: { name: string } | null;
  }>;
  recentFeedback: Array<{
    id: string;
    type: string;
    status: string;
    subject: string | null;
    createdAt: string;
    user: { firstName: string; email: string };
  }>;
  unresolvedFlags: number;
  unreadFeedbackByAdmin: number;
};

type AdminStats = {
  users: { total: number; active7d: number; active30d: number };
  traffic: { pageViews7d: number; pageViews30d: number; topPages: Array<{ path: string; views: number }> };
  feedback: { open: number; inProgress: number; closed: number };
  funnel: Array<{ eventName: string; count: number }>;
  overview?: AdminStatsOverview;
};

type ApiEnvelope<T> = {
  data?: T;
  message?: string | null;
};

async function parseApiResponse<T>(res: Response): Promise<ApiEnvelope<T>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    return { message: "Server returned a non-JSON response." };
  }
}

export function AdminPageClient() {
  const [tab, setTab] = useState<"inbox" | "stats">("inbox");
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inboxUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (statusFilter) sp.set("status", statusFilter);
    if (query.trim()) sp.set("q", query.trim());
    sp.set("limit", "50");
    return `/api/admin/feedback?${sp.toString()}`;
  }, [query, statusFilter]);

  const loadInbox = useCallback(async () => {
    setLoadingInbox(true);
    setError(null);
    try {
      const res = await fetch(inboxUrl, { credentials: "include" });
      const json = await parseApiResponse<{ items?: FeedbackItem[] }>(res);
      if (!res.ok) throw new Error(json?.message || "Failed to load inbox");
      setItems(json?.data?.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inbox");
    } finally {
      setLoadingInbox(false);
    }
  }, [inboxUrl]);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats", { credentials: "include" });
      const json = await parseApiResponse<AdminStats>(res);
      if (!res.ok) throw new Error(json?.message || "Failed to load stats");
      setStats(json?.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stats");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "inbox") void loadInbox();
  }, [tab, loadInbox]);

  useEffect(() => {
    if (tab === "stats" && !stats) void loadStats();
  }, [tab, stats, loadStats]);

  async function updateItem(id: string, patch: Record<string, unknown>) {
    const res = await fetch("/api/admin/feedback", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, ...patch }),
    });
    const json = await parseApiResponse<{ ok?: boolean }>(res);
    if (!res.ok) throw new Error(json?.message || "Failed to update feedback");
    await loadInbox();
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Admin</h1>
          <p className="text-sm text-slate-600">Triage crew feedback and track growth metrics.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => setTab("inbox")}
            className={`rounded-md px-3 py-1.5 text-sm ${tab === "inbox" ? "bg-[#1E6FB9] text-white" : "text-slate-600"}`}
          >
            Inbox
          </button>
          <button
            onClick={() => setTab("stats")}
            className={`rounded-md px-3 py-1.5 text-sm ${tab === "stats" ? "bg-[#1E6FB9] text-white" : "text-slate-600"}`}
          >
            Stats
          </button>
        </div>
      </header>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {tab === "inbox" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by user, subject, message"
              className="min-w-72 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="CLOSED">Closed</option>
            </select>
            <button onClick={() => loadInbox()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              Refresh
            </button>
          </div>

          <div className="grid gap-3">
            {loadingInbox && <p className="text-sm text-slate-500">Loading inbox...</p>}
            {!loadingInbox && items.length === 0 && <p className="text-sm text-slate-500">No feedback items found.</p>}
            {items.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{item.type}</span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{item.priority}</span>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{item.status}</span>
                  <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm font-medium text-slate-900">
                  {item.subject || "(no subject)"} - {item.userFirstName} {item.userLastName}
                </p>
                <p className="mt-1 text-sm text-slate-700">{item.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => updateItem(item.id, { status: "OPEN" })} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs">Open</button>
                  <button onClick={() => updateItem(item.id, { status: "IN_PROGRESS" })} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs">In progress</button>
                  <button onClick={() => updateItem(item.id, { status: "CLOSED" })} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs">Close</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === "stats" && (
        <div className="space-y-4">
          {loadingStats && <p className="text-sm text-slate-500">Loading stats...</p>}
          {!loadingStats && stats && (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total Users</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.users.total}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Active Users (7d)</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.users.active7d}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Active Users (30d)</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.users.active30d}</p>
                </div>
              </div>

              {stats.overview && (
                <div className="space-y-4">
                  <h2 className="text-sm font-semibold text-slate-800">Product overview</h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">New users (7d)</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{stats.overview.newUsersThisWeek}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Premium (paid)</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{stats.overview.premiumUsers}</p>
                      <p className="text-xs text-slate-500">{stats.overview.premiumPercent}% of all users</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">In trial</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{stats.overview.trialingUsers}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Trials expiring (7d)</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{stats.overview.trialsExpiringThisWeek}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Open swap posts</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{stats.overview.openSwapPosts}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Open line swaps</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{stats.overview.openLineSwapPosts}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Active conversations</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{stats.overview.activeConversations}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Flagged Accounts</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{stats.overview.unresolvedFlags}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Unread Feedback Replies</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{stats.overview.unreadFeedbackByAdmin}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <h3 className="text-sm font-semibold text-slate-900">Recent signups</h3>
                      <ul className="mt-2 space-y-2 text-sm text-slate-700">
                        {stats.overview.recentSignups.map((u) => (
                          <li key={u.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2 last:border-0">
                            <span>
                              {u.firstName} {u.lastName}{" "}
                              <span className="text-slate-400">{u.email}</span>
                            </span>
                            <span className="text-xs text-slate-500">
                              {u.rank?.name ?? "—"} · {new Date(u.createdAt).toLocaleDateString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <h3 className="text-sm font-semibold text-slate-900">Recent feedback</h3>
                      <ul className="mt-2 space-y-2 text-sm text-slate-700">
                        {stats.overview.recentFeedback.map((f) => (
                          <li key={f.id} className="border-b border-slate-100 pb-2 last:border-0">
                            <span className="font-medium text-slate-900">{f.subject || "(no subject)"}</span>
                            <span className="ml-2 text-xs text-slate-500">
                              {f.type} · {f.status}
                            </span>
                            <p className="text-xs text-slate-500">
                              {f.user.firstName} · {new Date(f.createdAt).toLocaleString()}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-900">Page Views</p>
                <p className="mt-1 text-sm text-slate-600">
                  7d: {stats.traffic.pageViews7d} | 30d: {stats.traffic.pageViews30d}
                </p>
                <div className="mt-3 space-y-1 text-sm text-slate-700">
                  {stats.traffic.topPages.map((p) => (
                    <p key={p.path}>
                      {p.path}: {p.views}
                    </p>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-900">Core Funnel (30d)</p>
                <div className="mt-2 grid gap-1 text-sm text-slate-700">
                  {stats.funnel.map((f) => (
                    <p key={f.eventName}>
                      {f.eventName}: {f.count}
                    </p>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
