"use client";

import { useCallback, useEffect, useState } from "react";

type SwapPostRow = {
  id: string;
  status: string;
  postType: string;
  createdAt: string;
  wantType: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  offeredTrips: Array<{ id: string; destination: string; departureDate: string }>;
};

type LinePostRow = {
  id: string;
  status: string;
  createdAt: string;
  lineNumber: string;
  month: string;
  year: number;
  user: { id: string; firstName: string; lastName: string; email: string };
};

type ApiEnvelope<T> = { data?: T; message?: string | null };

const terminal = new Set(["COMPLETED", "CANCELLED", "EXPIRED"]);

export function AdminPostsPageClient() {
  const [kind, setKind] = useState<"swap" | "line">("swap");
  const [swapPosts, setSwapPosts] = useState<SwapPostRow[]>([]);
  const [linePosts, setLinePosts] = useState<LinePostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/posts?type=${kind}`);
    const text = await res.text();
    let body: ApiEnvelope<{ kind: string; posts: unknown[] }> = {};
    try {
      body = text ? (JSON.parse(text) as ApiEnvelope<{ kind: string; posts: unknown[] }>) : {};
    } catch {
      body = { message: "Invalid JSON" };
    }
    if (!res.ok) {
      setError(body.message || "Failed to load posts");
    } else if (body.data?.kind === "line") {
      setLinePosts(body.data.posts as LinePostRow[]);
    } else if (body.data?.kind === "swap") {
      setSwapPosts(body.data.posts as SwapPostRow[]);
    }
    setLoading(false);
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  async function cancelPost(id: string) {
    if (!confirm("Cancel this post? It will be marked CANCELLED.")) return;
    setBusyId(id);
    setError(null);
    const res = await fetch("/api/admin/posts/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, kind, action: "cancel" }),
    });
    const text = await res.text();
    let body: ApiEnvelope<unknown> = {};
    try {
      body = text ? (JSON.parse(text) as ApiEnvelope<unknown>) : {};
    } catch {
      body = { message: "Invalid JSON" };
    }
    if (!res.ok) {
      setError(typeof body.message === "string" ? body.message : "Moderation failed");
    } else {
      await load();
    }
    setBusyId(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-content">Posts</h1>
        <p className="text-sm text-muted">Review recent swap and line posts. Cancel clears the listing from active trade flows.</p>
      </div>

      <div className="flex gap-2 rounded-xl border border-line bg-surface p-1">
        {(["swap", "line"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              kind === k ? "bg-[#1E6FB9] text-white" : "text-muted hover:bg-surface-2"
            }`}
          >
            {k === "swap" ? "Swap posts" : "Line swaps"}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : kind === "swap" ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-2 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Trips</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"> </th>
              </tr>
            </thead>
            <tbody>
              {swapPosts.map((p) => (
                <tr key={p.id} className="border-b border-line">
                  <td className="px-4 py-3">
                    <div className="font-medium text-content">
                      {p.user.firstName} {p.user.lastName}
                    </div>
                    <div className="text-xs text-muted">{p.user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-content-soft">
                    {p.postType} · {p.wantType}
                  </td>
                  <td className="px-4 py-3">{p.status}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {p.offeredTrips.map((t) => t.destination).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{new Date(p.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {!terminal.has(p.status) && (
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => void cancelPost(p.id)}
                        className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-2 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Line</th>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"> </th>
              </tr>
            </thead>
            <tbody>
              {linePosts.map((p) => (
                <tr key={p.id} className="border-b border-line">
                  <td className="px-4 py-3">
                    <div className="font-medium text-content">
                      {p.user.firstName} {p.user.lastName}
                    </div>
                    <div className="text-xs text-muted">{p.user.email}</div>
                  </td>
                  <td className="px-4 py-3">{p.lineNumber}</td>
                  <td className="px-4 py-3">
                    {p.month} {p.year}
                  </td>
                  <td className="px-4 py-3">{p.status}</td>
                  <td className="px-4 py-3 text-muted">{new Date(p.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {!terminal.has(p.status) && (
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => void cancelPost(p.id)}
                        className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
