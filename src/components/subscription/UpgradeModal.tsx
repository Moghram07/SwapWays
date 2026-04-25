"use client";

import type { ReactNode } from "react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  reason?: string;
}

const FEATURE_LABELS: Record<string, { title: string; icon: string }> = {
  line_swap: { title: "Line Swaps", icon: "📋" },
  vacation_swap: { title: "Vacation Swaps", icon: "🏖️" },
  exact_match: { title: "Match Percentages", icon: "🎯" },
  full_notes: { title: "Swap Notes", icon: "📝" },
  multiple_conversations: { title: "Multiple Conversations", icon: "💬" },
  unlimited_uploads: { title: "Unlimited Schedule Uploads", icon: "📅" },
  priority_placement: { title: "Priority Placement", icon: "⭐" },
  advanced_filters: { title: "Advanced Filters", icon: "🔍" },
  conversation_history: { title: "Conversation History", icon: "🧾" },
};

function PremiumFeatureItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#3BA34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
      <span>{children}</span>
    </li>
  );
}

export function UpgradeModal({ isOpen, onClose, feature = "", reason = "" }: UpgradeModalProps) {
  if (!isOpen) return null;
  const featureInfo = FEATURE_LABELS[feature] ?? { title: "This Feature", icon: "⭐" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="rounded-t-2xl bg-gradient-to-br from-[#2668B0] to-[#3BA34A] p-6 text-center text-white">
          <div className="mb-2 text-4xl">{featureInfo.icon}</div>
          <h2 className="text-xl font-bold">Upgrade to Premium</h2>
          <p className="mt-1 text-sm opacity-90">{featureInfo.title} is a Premium feature</p>
        </div>

        <div className="p-6">
          <p className="mb-4 text-sm text-gray-600">{reason || "Upgrade to unlock this premium capability."}</p>

          <div className="mb-4 rounded-xl border border-gray-200 p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-gray-900">35 SR</span>
              <span className="text-sm text-gray-500">/ month</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <PremiumFeatureItem>Exact match percentages</PremiumFeatureItem>
              <PremiumFeatureItem>Unblurred "Top matches for you" card</PremiumFeatureItem>
              <PremiumFeatureItem>Unlimited conversations + full history</PremiumFeatureItem>
              <PremiumFeatureItem>Post line swaps & vacation swaps</PremiumFeatureItem>
              <PremiumFeatureItem>Unlimited schedule uploads per month</PremiumFeatureItem>
              <PremiumFeatureItem>Full notes on all swap cards</PremiumFeatureItem>
              <PremiumFeatureItem>Posts stay active until trip date</PremiumFeatureItem>
              <PremiumFeatureItem>Best match sort + advanced filters</PremiumFeatureItem>
              <PremiumFeatureItem>Priority placement on Trade Board</PremiumFeatureItem>
              <PremiumFeatureItem>Push notifications for top matches</PremiumFeatureItem>
            </ul>
          </div>

          <button
            disabled
            className="w-full cursor-not-allowed rounded-xl bg-gray-300 py-3 font-medium text-gray-500"
          >
            Upgrade Coming Soon
          </button>
          <p className="mt-2 text-center text-xs text-gray-400">
            Payment processing will be available shortly.
          </p>

          <button
            onClick={onClose}
            className="mt-3 w-full py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
