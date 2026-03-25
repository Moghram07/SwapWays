"use client";

import { useState } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [text, setText] = useState("");

  function handleSend() {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-slate-200 px-4 py-3 bg-white">
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Type a message..."}
          disabled={disabled}
          rows={1}
          className="flex-1 text-gray-900 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="w-10 h-10 rounded-full text-white flex items-center justify-center disabled:opacity-50 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
