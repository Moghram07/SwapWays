-- CreateEnum
CREATE TYPE "TrialRewardType" AS ENUM ('SCHEDULE_UPLOAD', 'REFERRAL');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "referralCode" TEXT,
ADD COLUMN "trialExtended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "verifiedAt" TIMESTAMP(3),
ADD COLUMN "referredBy" TEXT,
ADD COLUMN "referralBonusCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "EmailVerificationCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialReward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TrialRewardType" NOT NULL,
    "daysGranted" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrialReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerUserId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "bonusDays" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "EmailVerificationCode_userId_createdAt_idx" ON "EmailVerificationCode"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrialReward_userId_type_key" ON "TrialReward"("userId", "type");

-- CreateIndex
CREATE INDEX "TrialReward_userId_createdAt_idx" ON "TrialReward"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referredUserId_key" ON "Referral"("referredUserId");

-- CreateIndex
CREATE INDEX "Referral_referrerUserId_createdAt_idx" ON "Referral"("referrerUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "EmailVerificationCode" ADD CONSTRAINT "EmailVerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialReward" ADD CONSTRAINT "TrialReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
