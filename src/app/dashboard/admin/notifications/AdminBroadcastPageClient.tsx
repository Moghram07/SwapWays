"use client";

import { useState, useEffect, useCallback } from "react";

type ApiEnvelope<T> = { data?: T; message?: string | null };
type BroadcastResult = { sent: number; audience: string; emailed: boolean; emailsSent?: number; emailsFailed?: number; firstFailureReason?: string | null; total?: number; processed?: number };
type Recipient = { id: string; firstName: string; lastName: string; email: string; lastBroadcastEmailedAt: string | null };

const DAILY_EMAIL_CAP = 100;

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 86_400_000);
}

export function AdminBroadcastPageClient() {
  const [audience, setAudience] = useState("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [emailUsers, setEmailUsers] = useState(false);
  const [emailOnly, setEmailOnly] = useState(false);
  const emailMode = emailUsers || emailOnly;

  // Recipient picker + "already emailed" memory.
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [skipEmailed, setSkipEmailed] = useState(true);
  const [windowDays, setWindowDays] = useState("7");

  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);

  const loadRecipients = useCallback(async (aud: string) => {
    setLoadingRecipients(true);
    try {
      const res = await fetch(`/api/admin/notifications/broadcast?audience=${encodeURIComponent(aud)}`);
      const body = (await res.json().catch(() => ({}))) as ApiEnvelope<{ users: Recipient[] }>;
      setRecipients(body.data?.users ?? []);
    } catch {
      setRecipients([]);
    } finally {
      setLoadingRecipients(false);
    }
  }, []);

  useEffect(() => {
    if (emailMode) {
      void loadRecipients(audience);
    } else {
      setRecipients([]);
      setSelectedIds(new Set());
      setRecipientSearch("");
    }
  }, [emailMode, audience, loadRecipients]);

  // A user counts as "recently emailed" if stamped within the chosen window.
  const wDays = Math.max(0, Number(windowDays) || 0);
  const recentlyEmailed = useCallback(
    (u: Recipient) => {
      if (!skipEmailed || wDays <= 0) return false;
      const d = daysSince(u.lastBroadcastEmailedAt);
      return d != null && d < wDays;
    },
    [skipEmailed, wDays]
  );

  // Re-seed the selection to everyone still eligible whenever the list or the
  // skip rules change. Manual checkbox toggles don't retrigger this.
  useEffect(() => {
    const eligible = recipients.filter((u) => !recentlyEmailed(u));
    setSelectedIds(new Set(eligible.map((u) => u.id)));
  }, [recipients, recentlyEmailed]);

  const query = recipientSearch.trim().toLowerCase();
  const matchesSearch = (u: Recipient) =>
    !query || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(query);
  // When skipping, hide already-emailed users entirely; otherwise show all (with a badge).
  const visible = recipients.filter((u) => matchesSearch(u) && !recentlyEmailed(u));
  const hiddenEmailedCount = skipEmailed ? recipients.filter((u) => recentlyEmailed(u)).length : 0;
  const selectedCount = selectedIds.size;
  const overCap = selectedCount > DAILY_EMAIL_CAP;

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function selectAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const u of visible) next.add(u.id);
      return next;
    });
  }
  function clearVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const u of visible) next.delete(u.id);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (emailMode && selectedCount === 0) {
      setError("Select at least one recipient.");
      return;
    }
    setSending(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/admin/notifications/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audience,
        title,
        message,
        emailUsers,
        emailOnly,
        userIds: emailMode ? Array.from(selectedIds) : undefined,
      }),
    });
    const text = await res.text();
    let body: ApiEnvelope<BroadcastResult> = {};
    try {
      body = text ? (JSON.parse(text) as ApiEnvelope<BroadcastResult>) : {};
    } catch {
      body = { message: "Invalid JSON" };
    }
    if (!res.ok) {
      setError(typeof body.message === "string" ? body.message : "Send failed");
    } else if (body.data) {
      const d = body.data;
      let emailNote = "";
      if (d.emailed) {
        const s = d.emailsSent ?? 0;
        const f = d.emailsFailed ?? 0;
        const failureHint = d.firstFailureReason ? ` Reason: ${d.firstFailureReason}` : " Check server logs.";
        emailNote = f > 0
          ? ` Emailed ${s}/${s + f} selected users (${f} failed.${failureHint})`
          : ` Emailed ${s} user${s !== 1 ? "s" : ""}.`;
      }
      const notifNote = d.sent > 0
        ? `Sent ${d.sent} in-app notification(s).`
        : "No in-app notifications created (email only).";
      setResult(`${notifNote}${emailNote}`);
      setTitle("");
      setMessage("");
      setEmailUsers(false);
      setEmailOnly(false);
    }
    setSending(false);
  }

  async function clearAll() {
    if (!confirm("Delete ALL announcements from every user's inbox? This cannot be undone.")) return;
    setClearing(true);
    setClearResult(null);
    const res = await fetch("/api/admin/notifications/broadcast", { method: "DELETE" });
    const body = await res.json().catch(() => ({})) as { data?: { deleted: number } };
    setClearResult(`Deleted ${body.data?.deleted ?? 0} announcement(s) from all users.`);
    setClearing(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Broadcast</h1>
        <p className="text-sm text-slate-600">
          Creates in-app notifications (type SYSTEM) for the selected audience. Use sparingly for product announcements.
        </p>
      </div>

      <form onSubmit={(e) => void submit(e)} className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Audience</span>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
          >
            <option value="all">All users</option>
            <option value="premium">Premium (active or trialing premium)</option>
            <option value="free">Free tier</option>
            <option value="trialing">Trialing</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Title</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
            maxLength={120}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Message</span>
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
            maxLength={2000}
          />
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={emailUsers}
              onChange={(e) => { setEmailUsers(e.target.checked); if (e.target.checked) setEmailOnly(false); }}
              className="h-4 w-4 rounded border-slate-300 accent-[#1E6FB9]"
            />
            <span className="text-slate-700">Also send as email to users</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={emailOnly}
              onChange={(e) => { setEmailOnly(e.target.checked); if (e.target.checked) setEmailUsers(false); }}
              className="h-4 w-4 rounded border-slate-300 accent-[#1E6FB9]"
            />
            <span className="text-slate-700">
              Email only <span className="text-slate-400">(no in-app notification — use to re-send a missed email)</span>
            </span>
          </label>
        </div>

        {emailMode && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-700">
                Recipients{" "}
                <span className="text-slate-500 font-normal">({selectedCount} selected)</span>
              </span>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={selectAllVisible} className="rounded border border-slate-300 px-2 py-1 text-slate-700 hover:bg-white">
                  Select {query ? "shown" : "all"}
                </button>
                <button type="button" onClick={clearVisible} className="rounded border border-slate-300 px-2 py-1 text-slate-700 hover:bg-white">
                  Clear {query ? "shown" : "all"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={skipEmailed}
                  onChange={(e) => setSkipEmailed(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-[#1E6FB9]"
                />
                <span className="text-slate-700">Skip users already emailed in the last</span>
              </label>
              <span className="flex items-center gap-1 text-sm">
                <input
                  type="number"
                  min={1}
                  value={windowDays}
                  onChange={(e) => setWindowDays(e.target.value)}
                  disabled={!skipEmailed}
                  className="w-16 rounded border border-slate-200 px-2 py-1 text-slate-900 disabled:opacity-50"
                />
                <span className="text-slate-600">days</span>
              </span>
            </div>

            {skipEmailed && hiddenEmailedCount > 0 && (
              <p className="text-xs text-slate-500">
                {hiddenEmailedCount} user{hiddenEmailedCount !== 1 ? "s" : ""} hidden — already emailed in the last {wDays} day{wDays !== 1 ? "s" : ""}. Uncheck the box above to show everyone.
              </p>
            )}

            <input
              type="search"
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />

            <p className="text-xs text-slate-600">
              Resend&apos;s free tier sends max <strong>{DAILY_EMAIL_CAP} emails/day</strong>. The list below auto-excludes
              anyone you already emailed, so you can just press Send each day until everyone&apos;s covered.
            </p>
            {overCap && (
              <p className="text-xs font-medium text-amber-700">
                ⚠️ {selectedCount} selected — anything past {DAILY_EMAIL_CAP} will likely fail on the free tier today.
              </p>
            )}

            <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white">
              {loadingRecipients ? (
                <p className="px-3 py-3 text-sm text-slate-500">Loading recipients…</p>
              ) : visible.length === 0 ? (
                <p className="px-3 py-3 text-sm text-slate-500">
                  {recipients.length > 0 && skipEmailed ? "Everyone has been emailed already. 🎉" : "No users match."}
                </p>
              ) : (
                visible.map((u) => {
                  const d = daysSince(u.lastBroadcastEmailedAt);
                  return (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(u.id)}
                        onChange={() => toggleOne(u.id)}
                        className="h-4 w-4 rounded border-slate-300 accent-[#1E6FB9]"
                      />
                      <span className="text-slate-800">{`${u.firstName} ${u.lastName}`.trim() || "(no name)"}</span>
                      {d != null && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                          emailed {d === 0 ? "today" : `${d}d ago`}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-slate-400">{u.email}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </div>
        )}
        {result && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
            {result}
          </div>
        )}
        <button
          type="submit"
          disabled={sending || (emailMode && selectedCount === 0)}
          className="rounded-lg bg-[#1E6FB9] px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
        >
          {sending ? "Sending…" : emailMode ? `Send to ${selectedCount} selected` : "Send broadcast"}
        </button>
      </form>

      <div className="max-w-xl rounded-xl border border-red-100 bg-white p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Danger zone</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Delete all announcements from every user&apos;s inbox and Messages page.
          </p>
        </div>
        {clearResult && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {clearResult}
          </div>
        )}
        <button
          type="button"
          onClick={() => void clearAll()}
          disabled={clearing}
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
        >
          {clearing ? "Deleting…" : "Delete all announcements"}
        </button>
      </div>
    </div>
  );
}
