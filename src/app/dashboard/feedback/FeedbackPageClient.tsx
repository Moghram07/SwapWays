"use client";

import { FormEvent, useState } from "react";

type FeedbackType = "REQUEST" | "QUESTION" | "SUGGESTION";

export function FeedbackPageClient() {
  const [type, setType] = useState<FeedbackType>("REQUEST");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setResult(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type, subject, message }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult(json?.message || "Failed to submit feedback.");
        return;
      }
      setMessage("");
      setSubject("");
      setResult("Thanks. Your feedback was submitted and added to admin inbox.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Help & Feedback</h1>
        <p className="text-sm text-slate-600">
          Send requests, questions, or suggestions directly to the support/admin inbox.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as FeedbackType)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1E6FB9]"
            >
              <option value="REQUEST">Request</option>
              <option value="QUESTION">Question</option>
              <option value="SUGGESTION">Suggestion</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Subject (optional)</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1E6FB9]"
              placeholder="Short title"
            />
          </label>
        </div>

        <label className="space-y-1 block">
          <span className="text-sm font-medium text-slate-700">Message</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            minLength={10}
            rows={6}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1E6FB9]"
            placeholder="Describe your request, issue, or idea..."
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#1E6FB9] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Send feedback"}
          </button>
          {result && <p className="text-sm text-slate-600">{result}</p>}
        </div>
      </form>
    </section>
  );
}
