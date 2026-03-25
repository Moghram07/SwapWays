"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ChatHeader, type ConversationForHeader } from "./ChatHeader";
import { TripComparisonBar } from "./TripComparisonBar";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { SwapProposalBar } from "./SwapProposalBar";
import { useMessages } from "@/hooks/useMessages";
import { mapTripsForChat } from "@/utils/chatTripMapping";

interface ConversationDetail {
  id: string;
  status: string;
  initiatorId: string;
  tradeOwnerId?: string | null;
  postOwnerId?: string | null;
  offeredTripId?: string | null;
  trade?: { scheduleTrip?: unknown };
  swapPost?: { offeredTrips: { scheduleTrip?: unknown }[] };
  offeredTrips?: { scheduleTrip?: unknown }[];
  offeredTrip?: unknown;
  initiator: { id: string; firstName: string; rank?: { name: string }; base?: { name: string } };
  tradeOwner?: { id: string; firstName: string; rank?: { name: string }; base?: { name: string } };
  postOwner?: { id: string; firstName: string; rank?: { name: string }; base?: { name: string } };
}

function ChatLoadingSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      <div className="shrink-0 h-14 px-4 border-b border-slate-200 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
        <div className="flex-1 space-y-1">
          <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
          <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="flex-1 overflow-hidden px-4 py-4 space-y-4">
        <div className="flex justify-start">
          <div className="h-10 max-w-[70%] w-48 bg-slate-100 rounded-2xl rounded-bl-sm animate-pulse" />
        </div>
        <div className="flex justify-end">
          <div className="h-10 max-w-[70%] w-56 bg-slate-200 rounded-2xl rounded-br-sm animate-pulse" />
        </div>
        <div className="flex justify-start">
          <div className="h-10 max-w-[70%] w-40 bg-slate-100 rounded-2xl rounded-bl-sm animate-pulse" />
        </div>
      </div>
      <div className="shrink-0 h-16 border-t border-slate-200 px-4 flex items-center">
        <div className="flex-1 h-10 bg-slate-100 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

interface ChatWindowProps {
  conversationId: string | null;
  currentUserId: string | undefined;
}

export function ChatWindow({ conversationId, currentUserId }: ChatWindowProps) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [conversationError, setConversationError] = useState<string | null>(null);

  const fetchConversation = (id: string) => {
    setConversationError(null);
    fetch(`/api/conversations/${id}`)
      .then((r) => {
        if (!r.ok) {
          setConversationError(r.status === 503 ? "Conversation temporarily unavailable. Try again." : "Could not load conversation.");
          setConversation(null);
          return null;
        }
        return r.json();
      })
      .then((json) => {
        if (json == null) return;
        const data = json.data;
        setConversation(data ?? null);
        if (!data) setConversationError("Could not load conversation.");
      })
      .catch(() => {
        setConversationError("Could not load conversation.");
        setConversation(null);
      });
  };

  const isDropdownOpenRef = useRef(false);
  const refetchConversation = useCallback(() => {
    if (!conversationId) return;
    fetch(`/api/conversations/${conversationId}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((json) => {
        if (json?.data) setConversation(json.data);
      })
      .catch(() => {});
  }, [conversationId]);

  const { messages, sendMessage, refresh } = useMessages(conversationId, currentUserId, {
    onConversationClosed: refetchConversation,
    pausePollingRef: isDropdownOpenRef,
  });

  useEffect(() => {
    if (!conversationId) {
      setConversation(null);
      setConversationError(null);
      return;
    }
    fetchConversation(conversationId);
  }, [conversationId]);

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4 bg-[var(--border-muted)]/50">
        <p className="text-slate-500">Select a conversation or start one from the Trade Board.</p>
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

  if (conversationError && !conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4 bg-[var(--border-muted)]/50">
        <p className="text-slate-600">{conversationError}</p>
        <button
          type="button"
          onClick={() => conversationId && fetchConversation(conversationId)}
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1"
          style={{ backgroundColor: "var(--primary-cta)" }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!conversation) {
    return <ChatLoadingSkeleton />;
  }

  const isClosed = conversation.status === "EXPIRED" || conversation.status === "DECLINED";
  const lastSwapProposedMsg = [...messages].reverse().find((m) => m.systemAction === "SWAP_PROPOSED");
  const lastSwapProposedByInitiator = lastSwapProposedMsg
    ? lastSwapProposedMsg.senderId === conversation.initiatorId
    : false;

  const handlePropose = async () => {
    await fetch(`/api/conversations/${conversationId}/propose-swap`, { method: "POST" });
    refresh();
    refetchConversation();
  };
  const handleAccept = async () => {
    await fetch(`/api/conversations/${conversationId}/accept-swap`, { method: "POST" });
    refresh();
    refetchConversation();
  };
  const handleDecline = async () => {
    await fetch(`/api/conversations/${conversationId}/decline-swap`, { method: "POST" });
    refresh();
    refetchConversation();
  };

  const isInitiator = conversation.initiatorId === currentUserId;
  const { myTrip, theirTrip, currentOfferId } = mapTripsForChat(currentUserId ?? "", {
    initiatorId: conversation.initiatorId,
    tradeOwnerId: conversation.tradeOwnerId,
    postOwnerId: conversation.postOwnerId,
    offeredTripId: conversation.offeredTripId,
    trade: conversation.trade,
    swapPost: conversation.swapPost,
    offeredTrip: conversation.offeredTrip,
    offeredTrips: conversation.offeredTrips,
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      <ChatHeader conversation={conversation as ConversationForHeader} currentUserId={currentUserId ?? ""} />
      <div className="shrink-0 px-4 pt-2 pb-1">
        <TripComparisonBar
          theirTrip={theirTrip as never}
          yourTrip={myTrip as never}
          isInitiator={isInitiator}
          conversationId={conversationId}
          currentOfferId={currentOfferId}
          onOfferChanged={refetchConversation}
          onDropdownOpenChange={(open) => {
            isDropdownOpenRef.current = open;
          }}
        />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.senderId === currentUserId}
          />
        ))}
      </div>
      {!isClosed && (
        <ChatInput
          onSend={sendMessage}
          disabled={false}
          placeholder="Type a message..."
        />
      )}
      <SwapProposalBar
        conversation={{
          id: conversation.id,
          status: conversation.status,
          initiatorId: conversation.initiatorId,
          offeredTripId: conversation.offeredTripId,
          offeredTrips: conversation.offeredTrips,
        }}
        currentUserId={currentUserId ?? ""}
        lastSwapProposedByInitiator={lastSwapProposedByInitiator}
        onPropose={handlePropose}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onOfferChanged={refetchConversation}
      />
    </div>
  );
}
