"use client";

import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { MessagesClient, type ConversationSummary } from "./MessagesClient";

const REQUEST_TIMEOUT_MS = 5000;

const fetcher = async <T,>(url: string): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { credentials: "include", signal: controller.signal });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return json as T;
    }
    return json as T;
  } catch {
    return { data: [], error: "Timeout", message: "Request timed out" } as T;
  } finally {
    clearTimeout(timer);
  }
};

type ConversationsResponse = {
  data?: ConversationSummary[];
  meta?: {
    tier?: "FREE" | "PREMIUM";
    canStartNewConversation?: boolean;
    conversationStartLimitReached?: boolean;
    allowedConversationId?: string | null;
  };
};

type ProfileResponse = {
  data?: { id?: string };
};

export function MessagesPageClient() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("conversation");

  const { data: profileJson } = useSWR<ProfileResponse>("/api/profile", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  const { data: convJson, isLoading } = useSWR<ConversationsResponse>("/api/conversations", fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 15_000,
  });

  const currentUserId = profileJson?.data?.id ?? "";
  const conversations = convJson?.data ?? [];
  const conversationMeta = convJson?.meta;

  if (isLoading && conversations.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="dashboard-page-title text-2xl text-slate-900">Messages</h1>
        <div className="h-[calc(100vh-12rem)] animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
      </div>
    );
  }

  return (
    <MessagesClient
      currentUserId={currentUserId}
      initialConversations={conversations}
      initialSelectedId={selectedId}
      conversationMeta={conversationMeta}
    />
  );
}
