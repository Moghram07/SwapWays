import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TRIAL_DAYS = 50;

export type TrialRewardGrantResult =
  | { granted: true; daysGranted: number; trialEndsAt: Date; capped: boolean }
  | { granted: false; reason: "ALREADY_GRANTED" | "USER_NOT_FOUND" | "CAP_REACHED" };

export async function grantTrialReward(input: {
  userId: string;
  type: "SCHEDULE_UPLOAD" | "REFERRAL";
  requestedDays: number;
  metadata?: Record<string, unknown>;
}): Promise<TrialRewardGrantResult> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: { id: true, trialStartedAt: true, trialEndsAt: true, trialExtended: true },
    });
    if (!user) return { granted: false as const, reason: "USER_NOT_FOUND" as const };

    if (input.type === "SCHEDULE_UPLOAD" && user.trialExtended) {
      return { granted: false as const, reason: "ALREADY_GRANTED" as const };
    }

    const capEndsAt = new Date(user.trialStartedAt.getTime() + MAX_TRIAL_DAYS * DAY_MS);
    if (user.trialEndsAt.getTime() >= capEndsAt.getTime()) {
      return { granted: false as const, reason: "CAP_REACHED" as const };
    }

    const baseline = user.trialEndsAt.getTime();
    const proposed = baseline + Math.max(0, input.requestedDays) * DAY_MS;
    const nextEndsAt = new Date(Math.min(proposed, capEndsAt.getTime()));
    const grantedDays = Math.ceil((nextEndsAt.getTime() - baseline) / DAY_MS);
    if (grantedDays <= 0) {
      return { granted: false as const, reason: "CAP_REACHED" as const };
    }

    await tx.user.update({
      where: { id: input.userId },
      data: {
        trialEndsAt: nextEndsAt,
        tier: "PREMIUM",
        subscriptionStatus: "TRIALING",
        ...(input.type === "SCHEDULE_UPLOAD" ? { trialExtended: true } : {}),
      },
    });
    const metadata = input.metadata as Prisma.InputJsonValue | undefined;
    await tx.trialReward.create({
      data: {
        userId: input.userId,
        type: input.type,
        daysGranted: grantedDays,
        ...(metadata ? { metadata } : {}),
      },
    });

    return {
      granted: true as const,
      daysGranted: grantedDays,
      trialEndsAt: nextEndsAt,
      capped: nextEndsAt.getTime() >= capEndsAt.getTime(),
    };
  });
}
