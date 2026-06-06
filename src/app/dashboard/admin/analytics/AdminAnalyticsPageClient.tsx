"use client";

import { useEffect, useState } from "react";

type AnalyticsPayload = {
  totalSignups: number;
  signupsThisMonth: number;
  signupsLastMonth: number;
  paidUsers: number;
  trialingUsers: number;
  freeUsers: number;
  totalSwapPosts: number;
  totalLineSwaps: number;
  totalConversations: number;
  totalMessages: number;
  totalSchedules: number;
  swapsThisWeek: number;
  messagesThisWeek: number;
  activeToday: number;
  dailySignups: Array<{ date: string; count: number }>;
};

type ApiEnvelope<T> = { data?: T; message?: string | null };

export function AdminAnalyticsPageClient() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/analytics");
      const text = await res.text();
      let body: ApiEnvelope<AnalyticsPayload> = {};
      try {
        body = text ? (JSON.parse(text) as ApiEnvelope<AnalyticsPayload>) : {};
      } catch {
        body = { message: "Invalid JSON" };
      }
      if (cancelled) return;
      if (!res.ok) {
        setError(body.message || "Failed to load analytics");
        setData(null);
      } else if (body.data) {
        setData(body.data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const maxDaily = data ? Math.max(1, ...data.dailySignups.map((d) => d.count)) : 1;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-content">Analytics</h1>
        <p className="text-sm text-muted">High-level counts and signups over the last 30 days.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      {loading && <p className="text-sm text-muted">Loading…</p>}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Total signups", data.totalSignups],
              ["This month", data.signupsThisMonth],
              ["Last month", data.signupsLastMonth],
              ["Paid (ACTIVE)", data.paidUsers],
              ["Trialing", data.trialingUsers],
              ["Free tier", data.freeUsers],
              ["Swap posts", data.totalSwapPosts],
              ["Line swaps", data.totalLineSwaps],
              ["Conversations", data.totalConversations],
              ["Messages", data.totalMessages],
              ["Schedules", data.totalSchedules],
              ["New swaps (7d)", data.swapsThisWeek],
              ["Messages (7d)", data.messagesThisWeek],
              ["Users active today", data.activeToday],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-line bg-surface p-4">
                <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-content">{value as number}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-line bg-surface p-4">
            <h2 className="text-sm font-semibold text-content">Daily signups (30 days)</h2>
            <div className="mt-4 flex h-44 gap-1 overflow-x-auto pb-1">
              {data.dailySignups.map((d, i) => (
                <div
                  key={`${d.date}-${i}`}
                  className="flex h-full min-w-[8px] flex-1 flex-col justify-end"
                  title={`${d.date}: ${d.count}`}
                >
                  <div
                    className="mx-auto w-full max-w-[12px] rounded-t bg-[#1E6FB9]/85"
                    style={{
                      height: `${Math.round((d.count / maxDaily) * 100)}%`,
                      minHeight: d.count > 0 ? 4 : 0,
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">Hover a bar for date and count.</p>
          </div>
        </>
      )}
    </div>
  );
}
