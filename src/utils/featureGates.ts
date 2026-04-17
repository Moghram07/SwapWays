import { prisma } from "@/lib/prisma";

export type AccessTier = "FREE" | "PREMIUM";

export interface UserAccess {
  tier: AccessTier;
  isTrialing: boolean;
  trialDaysRemaining: number;
  canPostLineSwap: boolean;
  canPostVacationSwap: boolean;
  canSeeExactMatch: boolean;
  canSeeFullNotes: boolean;
  canStartNewConversation: boolean;
  canViewConversationHistory: boolean;
  canUploadSchedule: boolean;
  postExpirationDays: number;
  hasPriorityPlacement: boolean;
  hasAdvancedFilters: boolean;
}

const FREE_NOTES_PREVIEW_LENGTH = 40;
const ACTIVE_CONVERSATION_STATUSES = ["ACTIVE", "SWAP_PROPOSED", "SWAP_ACCEPTED"] as const;

function computeIsPremium(
  user: {
    tier: "FREE" | "PREMIUM";
    trialEndsAt: Date;
    subscriptionStatus: string;
  },
  now: Date
): boolean {
  const isTrialing =
    user.subscriptionStatus === "TRIALING" && user.trialEndsAt.getTime() > now.getTime();
  const hasPaidSubscription = user.subscriptionStatus === "ACTIVE";
  return user.tier === "PREMIUM" && (isTrialing || hasPaidSubscription);
}

/**
 * Batch-resolve which user IDs currently have Premium-equivalent access (trial or paid ACTIVE).
 * Used when notifying multiple viewers without N separate getUserAccess calls.
 */
export async function getPremiumViewerIds(userIds: string[]): Promise<Set<string>> {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return new Set();

  const now = new Date();
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, tier: true, trialEndsAt: true, subscriptionStatus: true },
  });

  const premium = new Set<string>();
  for (const u of users) {
    if (computeIsPremium(u, now)) premium.add(u.id);
  }
  return premium;
}

export async function getUserAccess(userId: string): Promise<UserAccess> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      tier: true,
      trialEndsAt: true,
      subscriptionStatus: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const now = new Date();
  const isTrialing =
    user.subscriptionStatus === "TRIALING" && user.trialEndsAt.getTime() > now.getTime();
  const isPremium = computeIsPremium(user, now);
  const trialDaysRemaining = isTrialing
    ? Math.ceil((user.trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    : 0;

  const canUploadSchedule = isPremium ? true : await checkFreeUploadLimit(userId);
  const canStartNewConversation = isPremium ? true : await checkFreeConversationLimit(userId);

  return {
    tier: isPremium ? "PREMIUM" : "FREE",
    isTrialing,
    trialDaysRemaining,
    canPostLineSwap: isPremium,
    canPostVacationSwap: isPremium,
    canSeeExactMatch: isPremium,
    canSeeFullNotes: isPremium,
    canStartNewConversation,
    canViewConversationHistory: isPremium,
    canUploadSchedule,
    postExpirationDays: isPremium ? 365 : 7,
    hasPriorityPlacement: isPremium,
    hasAdvancedFilters: isPremium,
  };
}

async function checkFreeConversationLimit(userId: string): Promise<boolean> {
  const activeCount = await prisma.conversation.count({
    where: {
      OR: [{ initiatorId: userId }, { tradeOwnerId: userId }, { postOwnerId: userId }],
      status: { in: [...ACTIVE_CONVERSATION_STATUSES] },
    },
  });
  return activeCount === 0;
}

async function checkFreeUploadLimit(userId: string): Promise<boolean> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const uploadsThisMonth = await prisma.schedule.count({
    where: {
      userId,
      createdAt: { gte: startOfMonth },
    },
  });
  return uploadsThisMonth === 0;
}

export function getMatchTier(percent: number): "low" | "medium" | "high" | "none" {
  if (percent >= 70) return "high";
  if (percent >= 40) return "medium";
  if (percent > 0) return "low";
  return "none";
}

export function truncateNotesForFree(notes: string | null): { notes: string | null; isTruncated: boolean } {
  if (!notes) return { notes: null, isTruncated: false };
  if (notes.length <= FREE_NOTES_PREVIEW_LENGTH) return { notes, isTruncated: false };
  return {
    notes: notes.slice(0, FREE_NOTES_PREVIEW_LENGTH),
    isTruncated: true,
  };
}
