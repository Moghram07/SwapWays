-- CreateEnum
CREATE TYPE "UserTier" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "tier" "UserTier",
ADD COLUMN "trialStartedAt" TIMESTAMP(3),
ADD COLUMN "trialEndsAt" TIMESTAMP(3),
ADD COLUMN "subscriptionStatus" "SubscriptionStatus",
ADD COLUMN "subscribedAt" TIMESTAMP(3),
ADD COLUMN "subscriptionRenewsAt" TIMESTAMP(3),
ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- Backfill existing users by account age.
UPDATE "User"
SET
  "trialStartedAt" = COALESCE("trialStartedAt", "createdAt"),
  "trialEndsAt" = COALESCE("trialEndsAt", "createdAt" + INTERVAL '90 days'),
  "tier" = COALESCE(
    "tier",
    CASE
      WHEN ("createdAt" + INTERVAL '90 days') > NOW() THEN 'PREMIUM'::"UserTier"
      ELSE 'FREE'::"UserTier"
    END
  ),
  "subscriptionStatus" = COALESCE(
    "subscriptionStatus",
    CASE
      WHEN ("createdAt" + INTERVAL '90 days') > NOW() THEN 'TRIALING'::"SubscriptionStatus"
      ELSE 'EXPIRED'::"SubscriptionStatus"
    END
  );

-- Make required + defaults for new rows.
ALTER TABLE "User"
ALTER COLUMN "tier" SET NOT NULL,
ALTER COLUMN "tier" SET DEFAULT 'PREMIUM',
ALTER COLUMN "trialStartedAt" SET NOT NULL,
ALTER COLUMN "trialStartedAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "trialEndsAt" SET NOT NULL,
ALTER COLUMN "trialEndsAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "subscriptionStatus" SET NOT NULL,
ALTER COLUMN "subscriptionStatus" SET DEFAULT 'TRIALING';

-- CreateIndex
CREATE INDEX "User_subscriptionStatus_trialEndsAt_idx" ON "User"("subscriptionStatus", "trialEndsAt");
