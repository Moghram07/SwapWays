"use client";

import { useState } from "react";

type ApiEnvelope<T> = { data?: T; message?: string | null };
type BroadcastResult = { sent: number; audience: string; emailed: boolean };

export function AdminBroadcastPageClient() {
  const [audience, setAudience] = useState("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [emailUsers, setEmailUsers] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/admin/notifications/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audience, title, message, emailUsers }),
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
      const emailNote = body.data.emailed ? " Emails are being sent." : "";
      setResult(`Sent ${body.data.sent} notification(s) to audience: ${body.data.audience}.${emailNote}`);
      setTitle("");
      setMessage("");
      setEmailUsers(false);
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
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={emailUsers}
            onChange={(e) => setEmailUsers(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-[#1E6FB9]"
          />
          <span className="text-slate-700">Also send as email to users</span>
        </label>
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
          disabled={sending}
          className="rounded-lg bg-[#1E6FB9] px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send broadcast"}
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
