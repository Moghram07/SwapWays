-- Marketplace Redesign: SwapPost, SwapPostTrip, ConversationOffer
-- Run this if using raw SQL; otherwise use: npx prisma db push  or  npx prisma migrate dev

-- Enums
CREATE TYPE "SwapPostType" AS ENUM ('OFFERING_TRIPS', 'OFFERING_DAYS_OFF', 'GIVING_AWAY', 'LOOKING_FOR');
CREATE TYPE "SwapPostStatus" AS ENUM ('OPEN', 'IN_NEGOTIATION', 'AGREED', 'COMPLETED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "WantType" AS ENUM ('LAYOVER', 'LONGER_LAYOVER', 'ROUND_TRIP', 'ANY_FLIGHT', 'DAYS_OFF', 'ANYTHING', 'SPECIFIC');

-- SwapPost table
CREATE TABLE "SwapPost" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "postType" "SwapPostType" NOT NULL,
  "status" "SwapPostStatus" NOT NULL DEFAULT 'OPEN',
  "offeringDaysOff" BOOLEAN NOT NULL DEFAULT false,
  "offeredDaysOff" INTEGER[],
  "wantType" "WantType" NOT NULL,
  "wantTripTypes" "TripType"[],
  "wantMinLayover" DOUBLE PRECISION,
  "wantMinCredit" DOUBLE PRECISION,
  "wantMaxCredit" DOUBLE PRECISION,
  "wantEqualHours" BOOLEAN NOT NULL DEFAULT false,
  "wantSameDate" BOOLEAN NOT NULL DEFAULT false,
  "wantDestinations" TEXT[],
  "wantExclude" TEXT[],
  "wtfDays" INTEGER[],
  "wantDaysOff" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "SwapPost_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SwapPost_userId_idx" ON "SwapPost"("userId");
CREATE INDEX "SwapPost_status_idx" ON "SwapPost"("status");
CREATE INDEX "SwapPost_postType_idx" ON "SwapPost"("postType");
ALTER TABLE "SwapPost" ADD CONSTRAINT "SwapPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- SwapPostTrip table
CREATE TABLE "SwapPostTrip" (
  "id" TEXT NOT NULL,
  "swapPostId" TEXT NOT NULL,
  "scheduleTripId" TEXT NOT NULL,
  "flightNumber" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "departureDate" TIMESTAMP(3) NOT NULL,
  "tripType" "TripType" NOT NULL,
  "creditHours" DOUBLE PRECISION NOT NULL,
  "tafb" DOUBLE PRECISION NOT NULL,
  "hasLayover" BOOLEAN NOT NULL,
  "layoverCity" TEXT,
  "layoverHours" DOUBLE PRECISION,
  CONSTRAINT "SwapPostTrip_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SwapPostTrip_swapPostId_idx" ON "SwapPostTrip"("swapPostId");
ALTER TABLE "SwapPostTrip" ADD CONSTRAINT "SwapPostTrip_swapPostId_fkey" FOREIGN KEY ("swapPostId") REFERENCES "SwapPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SwapPostTrip" ADD CONSTRAINT "SwapPostTrip_scheduleTripId_fkey" FOREIGN KEY ("scheduleTripId") REFERENCES "ScheduleTrip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Conversation: add optional swap post columns
ALTER TABLE "Conversation" ALTER COLUMN "tradeId" DROP NOT NULL;
ALTER TABLE "Conversation" ALTER COLUMN "tradeOwnerId" DROP NOT NULL;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "swapPostId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "postOwnerId" TEXT;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_swapPostId_fkey" FOREIGN KEY ("swapPostId") REFERENCES "SwapPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_postOwnerId_fkey" FOREIGN KEY ("postOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_swapPostId_initiatorId_key" ON "Conversation"("swapPostId", "initiatorId");

-- ConversationOffer table
CREATE TABLE "ConversationOffer" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "scheduleTripId" TEXT NOT NULL,
  CONSTRAINT "ConversationOffer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ConversationOffer_conversationId_scheduleTripId_key" ON "ConversationOffer"("conversationId", "scheduleTripId");
ALTER TABLE "ConversationOffer" ADD CONSTRAINT "ConversationOffer_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationOffer" ADD CONSTRAINT "ConversationOffer_scheduleTripId_fkey" FOREIGN KEY ("scheduleTripId") REFERENCES "ScheduleTrip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
