"use client";

import { useState, useEffect, useCallback, useRef, type MutableRefObject } from "react";

export interface MessageWithSender {
  id: string;
  content: string;
  messageType: string;
  systemAction?: string | null;
  senderId: string;
  createdAt: string;
  sender: { id: string; firstName: string };
}

export interface UseMessagesOptions {
  onConversationClosed?: () => void;
  /** When true, polling is skipped (e.g. while trip dropdown is open). */
  pausePollingRef?: MutableRefObject<boolean>;
}

export function useMessages(
  conversationId: string | null,
  currentUserId: string | undefined,
  options?: UseMessagesOptions
) {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const onConversationClosed = options?.onConversationClosed;
  const pausePollingRef = options?.pausePollingRef;
  const lastMessageId = useRef<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    if (pausePollingRef?.current) return;
    try {
      const url = lastMessageId.current
        ? `/api/conversations/${conversationId}/messages?after=${lastMessageId.current}`
        : `/api/conversations/${conversationId}/messages`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error("fetchMessages failed", res.status, res.statusText);
        return;
      }
      const json = await res.json();
      const data = Array.isArray(json.data) ? (json.data as MessageWithSender[]) : null;
      if (!data || data.length === 0) return;

      setMessages((prev) => {
        if (prev.length === 0 || !lastMessageId.current) {
          lastMessageId.current = data[data.length - 1].id;
          return data;
        }
        const newOnes = data.filter((m: MessageWithSender) => !prev.some((p) => p.id === m.id));
        if (newOnes.length === 0) return prev;
        lastMessageId.current = newOnes[newOnes.length - 1].id;
        return [...prev, ...newOnes];
      });
    } catch (err) {
      console.error("fetchMessages error", err);
    }
  }, [conversationId, pausePollingRef]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (!conversationId) {
      setMessages([]);
      lastMessageId.current = null;
      return;
    }
    lastMessageId.current = null;
    void fetchMessages();

    const poll = () => {
      if (pausePollingRef?.current) {
        timer = setTimeout(poll, 5000);
        return;
      }
      void fetchMessages()
        .catch(() => {})
        .finally(() => {
          const nextMs = document.visibilityState === "visible" ? 5000 : 15000;
          timer = setTimeout(poll, nextMs);
        });
    };

    timer = setTimeout(poll, 5000);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [conversationId, fetchMessages, pausePollingRef]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !content.trim()) return;
      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: content.trim(), messageType: "TEXT" }),
        });
        const json = await res.json();
        if (json.data && currentUserId) {
          setMessages((prev) => [
            ...prev,
            {
              ...json.data,
              sender: { id: currentUserId, firstName: "You" },
            },
          ]);
          if (json.data.id) {
            lastMessageId.current = json.data.id;
          }
        } else if (!res.ok) {
          const msg = json.message ?? res.statusText;
          if (res.status === 400 && msg === "This conversation is closed") {
            onConversationClosed?.();
            return;
          }
          console.error("sendMessage failed", msg);
        }
      } catch (err) {
        console.error("sendMessage error", err);
      }
    },
    [conversationId, currentUserId, onConversationClosed]
  );

  return { messages, sendMessage, refresh: fetchMessages };
}
