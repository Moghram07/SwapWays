"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";

export interface ConversationSummary {
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

interface MessagesClientProps {
  currentUserId: string;
  initialConversations: ConversationSummary[];
  initialSelectedId: string | null;
}

export function MessagesClient({
  currentUserId,
  initialConversations,
  initialSelectedId,
}: MessagesClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);

  useEffect(() => {
    const id = searchParams.get("conversation");
    setSelectedId(id);
  }, [searchParams]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    router.replace(`/dashboard/messages?conversation=${id}`);
  };

  const handleDeleted = (deletedId: string) => {
    if (selectedId === deletedId) {
      setSelectedId(null);
      router.replace("/dashboard/messages");
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="dashboard-page-title text-2xl text-slate-900">Messages</h1>
      <div className="flex h-[calc(100vh-12rem)] rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div
          className={`w-full min-w-0 md:w-80 md:min-w-[18rem] md:max-w-sm shrink-0 border-r border-slate-200 flex flex-col overflow-hidden ${
            selectedId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              currentUserId={currentUserId}
              selectedId={selectedId}
              onSelect={handleSelect}
              initialConversations={initialConversations}
              onDeleted={handleDeleted}
            />
          </div>
        </div>
        <div
          className={`flex-1 flex flex-col min-w-0 ${!selectedId ? "hidden md:flex" : "flex"}`}
        >
          <ChatWindow
            conversationId={selectedId}
            currentUserId={currentUserId}
          />
        </div>
      </div>
    </div>
  );
}
