"use client";

import { useCallback, useEffect, useState } from "react";
import { daysUntil, formatDateShort } from "@/utils/timeFormat";

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  tier: string;
  subscriptionStatus: string;
  trialEndsAt: string;
  trialStartedAt: string | null;
  isVerified: boolean;
  daysRemaining: number;
  isExpired: boolean;
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

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Message state
  const [messageTarget, setMessageTarget] = useState<UserRow | null>(null);
  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

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

  useEffect(() => { void load(); }, [load]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
    const body = await parseJson(res);
    if (!res.ok) {
      setDeleteError(body.message || "Failed to delete user");
      setDeleting(false);
      return;
    }
    setDeleteTarget(null);
    setDeleting(false);
    void load();
  }

  async function handleSendMessage() {
    if (!messageTarget) return;
    setSending(true);
    setSendError(null);
    const res = await fetch(`/api/admin/users/${messageTarget.id}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: msgTitle || "Message from SwapWays", message: msgBody }),
    });
    const body = await parseJson(res);
    if (!res.ok) {
      setSendError(body.message || "Failed to send message");
      setSending(false);
      return;
    }
    setSending(false);
    setSendSuccess(true);
  }

  function openMessage(u: UserRow) {
    setMessageTarget(u);
    setMsgTitle("");
    setMsgBody("");
    setSendError(null);
    setSendSuccess(false);
  }

  function closeMessage() {
    setMessageTarget(null);
    setSendSuccess(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-content">Users</h1>
        <p className="text-sm text-muted">Search, message, or remove users.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Search</span>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
            className="min-w-[200px] rounded-lg border border-line px-3 py-2 text-content"
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
          <span className="text-muted">Filter</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-line px-3 py-2 text-content"
          >
            <option value="all">All</option>
            <option value="premium">Legacy premium records</option>
            <option value="free">Legacy free records</option>
            <option value="trialing">Legacy trialing records</option>
            <option value="verified">Verified users</option>
            <option value="unverified">Unverified users</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Tier</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Expires</th>
              <th className="px-4 py-3 font-medium">Verified</th>
              <th className="px-4 py-3 font-medium">Base</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">No users match.</td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-content">{u.firstName} {u.lastName}</div>
                    <div className="text-xs text-muted">{u.email}</div>
                    <div className="text-xs text-faint">{u.rank?.name ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-content">{u.tier}</td>
                  <td className="px-4 py-3">
                    <SubscriptionStatusBadge status={u.subscriptionStatus} />
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="text-content-soft">{formatDateShort(u.trialEndsAt)}</div>
                    <div className={u.isExpired ? "text-red-500" : u.daysRemaining <= 5 ? "text-amber-600" : "text-emerald-600"}>
                      {u.isExpired ? "Expired" : `${daysUntil(u.trialEndsAt)}d left`}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {u.isVerified
                      ? <span className="font-medium text-emerald-600">Verified</span>
                      : <span className="text-faint">Unverified</span>}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {u.base ? `${u.base.airportCode} · ${u.base.name}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openMessage(u)}
                        className="rounded-lg border border-[#1E6FB9] px-3 py-1.5 text-xs font-medium text-[#1E6FB9] hover:bg-blue-50"
                      >
                        Message
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDeleteTarget(u); setDeleteError(null); }}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-xl">
            <h2 className="text-base font-semibold text-content">Delete account?</h2>
            <p className="mt-2 text-sm text-muted">
              This will permanently delete{" "}
              <span className="font-semibold">{deleteTarget.firstName} {deleteTarget.lastName}</span>{" "}
              ({deleteTarget.email}) and all their data. This cannot be undone.
            </p>
            {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-content-soft hover:bg-surface-2 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message modal */}
      {messageTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-xl">
            <h2 className="text-base font-semibold text-content">Message user</h2>
            <p className="mt-1 text-sm text-muted">
              Sending to{" "}
              <span className="font-medium text-content-soft">{messageTarget.firstName} {messageTarget.lastName}</span>{" "}
              — appears in their notifications.
            </p>

            {sendSuccess ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Message sent successfully.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Title</label>
                  <input
                    type="text"
                    value={msgTitle}
                    onChange={(e) => setMsgTitle(e.target.value)}
                    placeholder="Message from SwapWays"
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm text-content focus:outline-none focus:ring-1 focus:ring-[#1E6FB9]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Message</label>
                  <textarea
                    rows={4}
                    value={msgBody}
                    onChange={(e) => setMsgBody(e.target.value)}
                    placeholder="Write your message here…"
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm text-content focus:outline-none focus:ring-1 focus:ring-[#1E6FB9]"
                  />
                </div>
                {sendError && <p className="text-sm text-red-600">{sendError}</p>}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeMessage}
                className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-content-soft hover:bg-surface-2"
              >
                {sendSuccess ? "Close" : "Cancel"}
              </button>
              {!sendSuccess && (
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={sending || !msgBody.trim()}
                  className="rounded-lg bg-[#1E6FB9] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send message"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SubscriptionStatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    TRIALING: "bg-blue-100 text-blue-700",
    ACTIVE: "bg-emerald-100 text-emerald-700",
    EXPIRED: "bg-surface-2 text-muted",
    CANCELLED: "bg-red-100 text-red-600",
    PAST_DUE: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${classes[status] ?? classes.EXPIRED}`}>
      {status}
    </span>
  );
}
