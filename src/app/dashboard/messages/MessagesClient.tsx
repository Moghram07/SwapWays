"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { AnnouncementsWindow, type Announcement } from "./AnnouncementsWindow";
import { Bell } from "lucide-react";

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

const ANNOUNCEMENTS_ID = "__announcements__";

interface MessagesClientProps {
  currentUserId: string;
  initialConversations: ConversationSummary[];
  initialSelectedId: string | null;
  announcements: Announcement[];
  onAnnouncementsOpened?: () => void;
  conversationMeta?: {
    tier?: "FREE" | "PREMIUM";
    canStartNewConversation?: boolean;
    conversationStartLimitReached?: boolean;
    allowedConversationId?: string | null;
  };
}

export function MessagesClient({
  currentUserId,
  initialConversations,
  initialSelectedId,
  announcements,
  onAnnouncementsOpened,
  conversationMeta,
}: MessagesClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const hasCalledOpenRef = useRef(false);

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

  const isAnnouncementsSelected = selectedId === ANNOUNCEMENTS_ID;

  useEffect(() => {
    if (isAnnouncementsSelected && !hasCalledOpenRef.current) {
      hasCalledOpenRef.current = true;
      onAnnouncementsOpened?.();
    }
    if (!isAnnouncementsSelected) {
      hasCalledOpenRef.current = false;
    }
  }, [isAnnouncementsSelected, onAnnouncementsOpened]);
  const latestAnnouncement = announcements[0];
  const unreadAnnouncements = announcements.filter((a) => !a.isRead).length;

  return (
    <div className="space-y-4">
      <h1 className="dashboard-page-title text-2xl text-slate-900">Messages</h1>
      <div className="flex h-[calc(100vh-12rem)] max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
        {/* Left: conversation list */}
        <div
          className={`w-full min-w-0 md:w-80 md:min-w-[18rem] md:max-w-sm shrink-0 border-r border-slate-200 flex flex-col overflow-hidden ${
            selectedId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* Pinned Announcements entry */}
            {announcements.length > 0 && (
              <div className="px-2 pt-2">
                <div className="group relative">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isAnnouncementsSelected}
                    onClick={() => handleSelect(ANNOUNCEMENTS_ID)}
                    className={`min-h-[52px] w-full text-left px-4 py-3 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1 ${
                      isAnnouncementsSelected
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 w-9 h-9 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center">
                        <Bell className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="font-medium text-slate-900 truncate">Announcements</p>
                        </div>
                        <p className="text-sm text-slate-500 truncate mt-0.5">
                          {latestAnnouncement?.title ?? "No announcements"}
                        </p>
                      </div>
                      {unreadAnnouncements > 0 && (
                        <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--primary)] text-white text-xs flex items-center justify-center font-medium">
                          {unreadAnnouncements > 9 ? "9+" : unreadAnnouncements}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
                <div className="my-2 border-b border-slate-100" />
              </div>
            )}

            <ConversationList
              currentUserId={currentUserId}
              selectedId={isAnnouncementsSelected ? null : selectedId}
              onSelect={handleSelect}
              initialConversations={initialConversations}
              conversationMeta={conversationMeta}
              onDeleted={handleDeleted}
            />
          </div>
        </div>

        {/* Right: chat or announcements */}
        <div className={`flex-1 flex flex-col min-w-0 ${!selectedId ? "hidden md:flex" : "flex"}`}>
          {isAnnouncementsSelected ? (
            <AnnouncementsWindow items={announcements} />
          ) : (
            <ChatWindow conversationId={selectedId} currentUserId={currentUserId} />
          )}
        </div>
      </div>
    </div>
  );
}
