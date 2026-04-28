"use client";

import { useEffect, useState } from "react";

type FlagItem = {
  id: string;
  type: string;
  details: string;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
};

type ApiResponse = { data?: FlagItem[]; message?: string | null };

export function AdminFlagsPageClient() {
  const [items, setItems] = useState<FlagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/flags");
    const body = (await res.json().catch(() => ({}))) as ApiResponse;
    if (!res.ok) {
      setError(body.message || "Failed to load flags");
      setItems([]);
    } else {
      setItems(body.data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function resolveFlag(flagId: string, action: "DISMISS" | "WARN" | "REVOKE") {
    const notes =
      action === "DISMISS"
        ? "Reviewed and dismissed."
        : action === "WARN"
          ? "Warning sent."
          : "Premium revoked due to account sharing.";
    const res = await fetch("/api/admin/flags/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flagId, action, notes }),
    });
    if (res.ok) await load();
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Flagged Accounts</h1>
        <p className="text-sm text-slate-600">Review suspicious activity flags and resolve them.</p>
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {loading ? (
        <p className="text-sm text-slate-500">Loading flags...</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No unresolved flags.</p>
      ) : (
        <div className="space-y-3">
          {items.map((flag) => (
            <article key={flag.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {flag.user.firstName} {flag.user.lastName} <span className="font-normal text-slate-500">{flag.user.email}</span>
                </p>
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">{flag.type}</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{flag.details}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => resolveFlag(flag.id, "DISMISS")} className="rounded-md bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700">Dismiss</button>
                <button onClick={() => resolveFlag(flag.id, "WARN")} className="rounded-md bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700">Warn</button>
                <button onClick={() => resolveFlag(flag.id, "REVOKE")} className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700">Revoke Premium</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
