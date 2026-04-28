"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { formatDateShort, formatTime } from "@/utils/timeFormat";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ThreadMessage = {
  id: string;
  message: string;
  isAdmin: boolean;
  createdAt: string;
};

type ThreadData = {
  id: string;
  type: string;
  status: string;
  subject: string | null;
  message: string;
  createdAt: string;
  messages: ThreadMessage[];
};

export function FeedbackThreadPageClient() {
  const params = useParams<{ id: string }>();
  const feedbackId = params?.id;
  const { data, mutate } = useSWR<{ data?: ThreadData }>(
    feedbackId ? `/api/feedback/${feedbackId}` : null,
    fetcher,
    {
      refreshInterval: () => (typeof document !== "undefined" && document.visibilityState === "visible" ? 15000 : 0),
      dedupingInterval: 5_000,
      revalidateOnFocus: true,
    }
  );
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!feedbackId) return;
    fetch(`/api/feedback/${feedbackId}/mark-read`, { method: "POST" }).catch(() => {});
  }, [feedbackId]);

  const closed = useMemo(() => data?.data?.status === "CLOSED", [data?.data?.status]);

  async function sendReply() {
    if (!feedbackId || !reply.trim() || closed) return;
    setSending(true);
    await fetch(`/api/feedback/${feedbackId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: reply }),
    });
    setReply("");
    setSending(false);
    await mutate();
  }

  if (!data?.data) {
    return <p className="text-sm text-slate-500">Loading ticket...</p>;
  }

  const ticket = data.data;
  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <Link href="/dashboard/feedback" className="text-sm text-[#1E6FB9] hover:underline">
        Back to feedback
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{ticket.type}</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{ticket.status}</span>
        </div>
        <h1 className="mt-2 text-lg font-semibold text-slate-900">{ticket.subject || "(no subject)"}</h1>
        <p className="text-xs text-slate-500">Submitted {formatDateShort(ticket.createdAt)}</p>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <Bubble isMine message={ticket.message} sender="You" createdAt={ticket.createdAt} />
        {ticket.messages.map((m) => (
          <Bubble
            key={m.id}
            isMine={!m.isAdmin}
            message={m.message}
            sender={m.isAdmin ? "SwapWays Support" : "You"}
            createdAt={m.createdAt}
          />
        ))}
      </div>

      {!closed ? (
        <div className="flex gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void sendReply()}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            placeholder="Reply to support..."
          />
          <button
            onClick={() => void sendReply()}
            disabled={sending || !reply.trim()}
            className="rounded-lg bg-[#1E6FB9] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      ) : (
        <p className="text-sm text-slate-500">This ticket is closed.</p>
      )}
    </section>
  );
}

function Bubble({
  isMine,
  message,
  sender,
  createdAt,
}: {
  isMine: boolean;
  message: string;
  sender: string;
  createdAt: string;
}) {
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-xl px-3 py-2 ${isMine ? "bg-[#1E6FB9] text-white" : "bg-slate-100 text-slate-800"}`}>
        <p className="text-sm">{message}</p>
        <p className={`mt-1 text-[10px] ${isMine ? "text-blue-200" : "text-slate-500"}`}>
          {sender} · {formatTime(createdAt)}
        </p>
      </div>
    </div>
  );
}
