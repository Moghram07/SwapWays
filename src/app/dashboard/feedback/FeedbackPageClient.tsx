"use client";

import { FormEvent, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { formatDateShort } from "@/utils/timeFormat";

type FeedbackType = "REQUEST" | "QUESTION" | "SUGGESTION";
type Ticket = {
  id: string;
  type: FeedbackType;
  subject: string | null;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED";
  hasUnreadByUser: boolean;
  createdAt: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function FeedbackPageClient() {
  const { data: ticketsData, mutate } = useSWR<{ data?: Ticket[] }>("/api/feedback/mine", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 15_000,
  });
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
      await mutate();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-content">Help & Feedback</h1>
        <p className="text-sm text-muted">
          Send requests, questions, or suggestions. You can reply inside each ticket thread.
        </p>
      </header>

      {(ticketsData?.data?.length ?? 0) > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-content-soft">My Tickets</h2>
          <div className="space-y-2">
            {(ticketsData?.data ?? []).map((ticket) => (
              <Link
                key={ticket.id}
                href={`/dashboard/feedback/${ticket.id}`}
                className="flex items-center justify-between rounded-xl border border-line bg-surface p-3 hover:border-[#1E6FB9]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-content">{ticket.subject || "(no subject)"}</p>
                  <p className="text-xs text-muted">{formatDateShort(ticket.createdAt)}</p>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-content-soft">{ticket.status}</span>
                  {ticket.hasUnreadByUser && <span className="h-2 w-2 rounded-full bg-[#1E6FB9]" />}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-line bg-surface p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-content-soft">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as FeedbackType)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-content outline-none focus:border-[#1E6FB9]"
            >
              <option value="REQUEST">Request</option>
              <option value="QUESTION">Question</option>
              <option value="SUGGESTION">Suggestion</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-content-soft">Subject (optional)</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-content placeholder:text-faint outline-none focus:border-[#1E6FB9]"
              placeholder="Short title"
            />
          </label>
        </div>

        <label className="space-y-1 block">
          <span className="text-sm font-medium text-content-soft">Message</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            minLength={10}
            rows={6}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-content placeholder:text-faint outline-none focus:border-[#1E6FB9]"
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
          {result && <p className="text-sm text-muted">{result}</p>}
        </div>
      </form>
    </section>
  );
}
