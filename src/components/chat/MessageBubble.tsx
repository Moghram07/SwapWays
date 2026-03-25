"use client";

import type { MessageWithSender } from "@/hooks/useMessages";
import { SystemMessage } from "./SystemMessage";

function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function MessageBubble({
  message,
  isOwn,
}: {
  message: MessageWithSender;
  isOwn: boolean;
}) {
  if (message.messageType === "SYSTEM") {
    return <SystemMessage message={message} />;
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
          isOwn
            ? "bg-[#1E6FB9] text-white rounded-br-md"
            : "bg-slate-100 text-slate-900 rounded-bl-md"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p
          className={`text-xs mt-1 ${
            isOwn ? "text-blue-200" : "text-slate-400"
          }`}
        >
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
