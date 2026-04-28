"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { formatTimeAgo, formatTime } from "@/utils/timeFormat";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type FeedbackListItem = {
  id: string;
  type: string;
  status: string;
  subject: string | null;
  message: string;
  createdAt: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  hasUnreadByAdmin?: boolean;
};

type FeedbackDetail = {
  id: string;
  type: string;
  status: string;
  subject: string | null;
  message: string;
  createdAt: string;
  hasUnreadByAdmin: boolean;
  user: { firstName: string; lastName: string; email: string };
  messages: Array<{ id: string; message: string; isAdmin: boolean; createdAt: string }>;
};

export function AdminFeedbackThreadPageClient() {
  const { data, mutate } = useSWR<{ data?: { items?: FeedbackListItem[] } }>("/api/admin/feedback?limit=50", fetcher);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const firstTicketId = data?.data?.items?.[0]?.id ?? null;
  const selected = useMemo(
    () => (selectedId ? (data?.data?.items ?? []).find((x) => x.id === selectedId) ?? null : null),
    [data?.data?.items, selectedId]
  );

  useEffect(() => {
    if (!selectedId && firstTicketId) {
      setSelectedId(firstTicketId);
    }
  }, [firstTicketId, selectedId]);

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h1 className="text-base font-semibold text-slate-900">Feedback Inbox</h1>
          <p className="text-xs text-slate-500">Open a ticket to reply in thread.</p>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {(data?.data?.items ?? []).map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={`w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${
                selectedId === item.id ? "bg-slate-50" : ""
              }`}
            >
              <p className="truncate text-sm font-medium text-slate-900">{item.subject || "(no subject)"}</p>
              <p className="truncate text-xs text-slate-500">
                {item.userFirstName} {item.userLastName} · {item.userEmail}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">{item.status}</span>
                <span className="text-[10px] text-slate-400">{formatTimeAgo(item.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected ? <FeedbackChatPanel feedbackId={selected.id} onMutate={mutate} /> : <p className="text-sm text-slate-500">Select a feedback ticket.</p>}
    </section>
  );
}

function FeedbackChatPanel({ feedbackId, onMutate }: { feedbackId: string; onMutate: () => Promise<unknown> }) {
  const { data, mutate } = useSWR<{ data?: FeedbackDetail }>(`/api/admin/feedback/${feedbackId}`, fetcher, {
    refreshInterval: 15000,
  });
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!data?.data?.hasUnreadByAdmin) return;
    fetch(`/api/admin/feedback/${feedbackId}/mark-read`, { method: "POST" }).catch(() => {});
  }, [data?.data?.hasUnreadByAdmin, feedbackId]);

  async function sendReply() {
    if (!reply.trim()) return;
    setSending(true);
    await fetch(`/api/admin/feedback/${feedbackId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: reply }),
    });
    setReply("");
    setSending(false);
    await mutate();
    await onMutate();
  }

  if (!data?.data) return <p className="text-sm text-slate-500">Loading thread...</p>;
  const fb = data.data;
  return (
    <div className="flex max-h-[70vh] flex-col rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{fb.subject || "(no subject)"}</h2>
        <p className="text-xs text-slate-500">
          {fb.user.firstName} {fb.user.lastName} · {fb.user.email}
        </p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <Bubble message={fb.message} isMine={false} sender={fb.user.firstName} createdAt={fb.createdAt} />
        {fb.messages.map((m) => (
          <Bubble key={m.id} message={m.message} isMine={m.isAdmin} sender={m.isAdmin ? "You" : fb.user.firstName} createdAt={m.createdAt} />
        ))}
      </div>
      <div className="border-t border-slate-100 p-3">
        <div className="flex gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void sendReply()}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            placeholder="Reply to user..."
          />
          <button onClick={() => void sendReply()} disabled={sending || !reply.trim()} className="rounded-lg bg-[#1E6FB9] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  message,
  isMine,
  sender,
  createdAt,
}: {
  message: string;
  isMine: boolean;
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
