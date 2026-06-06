"use client";

interface ConversationLockScreenProps {
  hasActiveConversation: boolean;
  onUpgradeClick: () => void;
}

export function ConversationLockScreen({
  hasActiveConversation,
  onUpgradeClick,
}: ConversationLockScreenProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mb-4 text-5xl">🔒</div>
        <h2 className="mb-2 text-xl font-bold text-content">Conversation Locked</h2>
        <p className="mb-6 text-sm text-muted">
          {hasActiveConversation
            ? "Free tier allows 1 active conversation at a time. Close your current conversation or upgrade to Premium for unlimited conversations."
            : "Upgrade to Premium to view conversation history and have unlimited active conversations."}
        </p>
        <button
          onClick={onUpgradeClick}
          className="w-full rounded-xl bg-[#2668B0] py-3 font-medium text-white hover:bg-[#1e5a9e]"
        >
          Upgrade to Premium
        </button>
      </div>
    </div>
  );
}
