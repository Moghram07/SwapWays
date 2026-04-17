"use client";

import { useState } from "react";

type ApiEnvelope<T> = { data?: T; message?: string | null };

export function AdminBroadcastPageClient() {
  const [audience, setAudience] = useState("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/admin/notifications/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audience, title, message }),
    });
    const text = await res.text();
    let body: ApiEnvelope<{ sent: number; audience: string }> = {};
    try {
      body = text ? (JSON.parse(text) as ApiEnvelope<{ sent: number; audience: string }>) : {};
    } catch {
      body = { message: "Invalid JSON" };
    }
    if (!res.ok) {
      setError(typeof body.message === "string" ? body.message : "Send failed");
    } else if (body.data) {
      setResult(`Sent ${body.data.sent} notification(s) to audience: ${body.data.audience}.`);
      setTitle("");
      setMessage("");
    }
    setSending(false);
  }

  return (
    <div className="space-y-4">
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
    </div>
  );
}
