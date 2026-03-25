"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ConversationListItem } from "./ConversationListItem";

interface ConversationSummary {
  id: string;
  initiatorId: string;
  tradeOwnerId?: string | null;
  tradeOwner?: { firstName: string } | null;
  postOwnerId?: string | null;
  postOwner?: { firstName: string } | null;
  initiator: { firstName: string };
  messages: { content: string }[];
  lastMessageAt: string;
  unreadCount: number;
}

interface ConversationListProps {
  currentUserId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  initialConversations?: ConversationSummary[];
  onDeleted?: (deletedId: string) => void;
}

export function ConversationList({ currentUserId, selectedId, onSelect, initialConversations, onDeleted }: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>(initialConversations ?? []);

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((json) => {
        if (json?.data) setConversations(json.data);
      })
      .catch(() => setConversations([]));
  }, []);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setConversations((prev) => prev.filter((c) => c.id !== id));
    onDeleted?.(id);
  };

  if (conversations.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-slate-500 text-sm">
          No conversations yet. Start one from the Trade Board.
        </p>
        <Link
          href="/dashboard/matches"
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1"
          style={{ backgroundColor: "var(--primary-cta)" }}
        >
          Go to Trade Board
        </Link>
      </div>
    );
  }

  return (
    <ul className="p-2 space-y-1" role="listbox" aria-label="Conversations">
      {conversations.map((conv) => {
        const isInitiator = conv.initiatorId === currentUserId;
        const other = conv.tradeOwner ?? conv.postOwner;
        const otherName = isInitiator ? (other?.firstName ?? "Crew") : conv.initiator.firstName;
        const lastMsg = conv.messages[0]?.content ?? null;
        return (
          <li key={conv.id}>
            <ConversationListItem
              id={conv.id}
              otherName={otherName}
              lastMessagePreview={lastMsg}
              lastMessageAt={conv.lastMessageAt}
              unreadCount={conv.unreadCount ?? 0}
              isActive={selectedId === conv.id}
              onClick={() => onSelect(conv.id)}
              onDelete={handleDelete}
            />
          </li>
        );
      })}
    </ul>
  );
}
