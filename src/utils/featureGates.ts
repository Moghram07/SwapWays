import { prisma } from "@/lib/prisma";

export type AccessTier = "FREE" | "PREMIUM";

export interface UserAccess {
  tier: AccessTier;
  isVerified: boolean;
  isTrialing: boolean;
  trialDaysRemaining: number;
  freeConversationDailyLimit: number;
  freeConversationStartsRemaining: number;
  canPostLineSwap: boolean;
  canPostVacationSwap: boolean;
  canSeeExactMatch: boolean;
  canSeeFullNotes: boolean;
  canStartNewConversation: boolean;
  canViewConversationHistory: boolean;
  canUploadSchedule: boolean;
  /** True if the user has at least one uploaded schedule (e.g. PDF line). */
  hasUploadedSchedule: boolean;
  postExpirationDays: number;
  hasPriorityPlacement: boolean;
  hasAdvancedFilters: boolean;
}

const FREE_NOTES_PREVIEW_LENGTH = 40;

/**
 * Batch-resolve which user IDs currently have Premium-equivalent access (trial or paid ACTIVE).
 * Used when notifying multiple viewers without N separate getUserAccess calls.
 */
export async function getPremiumViewerIds(userIds: string[]): Promise<Set<string>> {
  const unique = [...new Set(userIds)].filter(Boolean);
  return new Set(unique);
}

export async function getUserAccess(userId: string): Promise<UserAccess> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      tier: true,
      trialEndsAt: true,
      subscriptionStatus: true,
      isVerified: true,
      _count: { select: { schedules: true } },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const isTrialing = false;
  const trialDaysRemaining = 0;
  const canUploadSchedule = true;
  const canStartNewConversation = true;
  const freeConversationDailyLimit = Number.POSITIVE_INFINITY;
  const freeConversationStartsRemaining = Number.POSITIVE_INFINITY;

  return {
    tier: "PREMIUM",
    isVerified: user.isVerified,
    isTrialing,
    trialDaysRemaining,
    freeConversationDailyLimit,
    freeConversationStartsRemaining,
    canPostLineSwap: true,
    canPostVacationSwap: true,
    canSeeExactMatch: true,
    canSeeFullNotes: true,
    canStartNewConversation,
    canViewConversationHistory: true,
    canUploadSchedule,
    hasUploadedSchedule: (user._count.schedules ?? 0) > 0,
    postExpirationDays: 365,
    hasPriorityPlacement: true,
    hasAdvancedFilters: true,
  };
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
