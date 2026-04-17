"use client";

import { useCallback, useEffect, useState } from "react";

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  tier: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  trialStartedAt: string | null;
  createdAt: string;
  rank: { name: string } | null;
  base: { name: string; airportCode: string } | null;
};

type ApiEnvelope<T> = { data?: T; message?: string | null; error?: string | null };

async function parseJson<T>(res: Response): Promise<ApiEnvelope<T>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    return { message: "Invalid response" };
  }
}

export function AdminUsersPageClient() {
  const [filter, setFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (filter !== "all") params.set("filter", filter);
    const res = await fetch(`/api/admin/users?${params.toString()}`);
    const body = await parseJson<UserRow[]>(res);
    if (!res.ok) {
      setError(body.message || "Failed to load users");
      setRows([]);
    } else if (body.data) {
      setRows(body.data);
    }
    setLoading(false);
  }, [search, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setTier(userId: string, tier: "PREMIUM" | "FREE") {
    setBusyId(userId);
    setError(null);
    const res = await fetch("/api/admin/users/update-tier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, tier }),
    });
    const body = await parseJson<unknown>(res);
    if (!res.ok) {
      setError(typeof body.message === "string" ? body.message : "Update failed");
    } else {
      await load();
    }
    setBusyId(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Users</h1>
        <p className="text-sm text-slate-600">Search, filter, and adjust subscription tier (aligned with app access rules).</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Search</span>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
            className="min-w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
            placeholder="Name or email"
          />
        </label>
        <button
          type="button"
          onClick={() => setSearch(searchInput)}
          className="rounded-lg bg-[#1E6FB9] px-4 py-2 text-sm font-medium text-white hover:opacity-95"
        >
          Search
        </button>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Filter</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
          >
            <option value="all">All</option>
            <option value="premium">Premium (active or trialing)</option>
            <option value="free">Free tier</option>
            <option value="trialing">Trialing</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Tier</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Base</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No users match.
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {u.firstName} {u.lastName}
                    </div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                    <div className="text-xs text-slate-400">{u.rank?.name ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-800">{u.tier}</td>
                  <td className="px-4 py-3 text-slate-700">{u.subscriptionStatus}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {u.base ? `${u.base.airportCode} · ${u.base.name}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => void setTier(u.id, "PREMIUM")}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Grant premium
                      </button>
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => void setTier(u.id, "FREE")}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Set free
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
