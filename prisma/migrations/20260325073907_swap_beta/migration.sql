-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('REQUEST', 'QUESTION', 'SUGGESTION');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "FeedbackPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "FeedbackType" NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "FeedbackPriority" NOT NULL DEFAULT 'NORMAL',
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "adminNote" TEXT,
    "assigneeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "anonymousId" TEXT,
    "eventName" TEXT NOT NULL,
    "path" TEXT,
    "properties" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_userId_createdAt_idx" ON "Feedback"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Feedback_status_createdAt_idx" ON "Feedback"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Feedback_type_createdAt_idx" ON "Feedback"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Feedback_assigneeId_status_idx" ON "Feedback"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "AppEvent_eventName_createdAt_idx" ON "AppEvent"("eventName", "createdAt");

-- CreateIndex
CREATE INDEX "AppEvent_userId_createdAt_idx" ON "AppEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AppEvent_path_createdAt_idx" ON "AppEvent"("path", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_initiatorId_lastMessageAt_idx" ON "Conversation"("initiatorId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_tradeOwnerId_lastMessageAt_idx" ON "Conversation"("tradeOwnerId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_postOwnerId_lastMessageAt_idx" ON "Conversation"("postOwnerId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Trade_userId_status_createdAt_idx" ON "Trade"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Trade_tradeType_status_departureDate_idx" ON "Trade"("tradeType", "status", "departureDate");

-- CreateIndex
CREATE INDEX "Trade_status_departureDate_idx" ON "Trade"("status", "departureDate");

-- CreateIndex
CREATE INDEX "Trade_userId_tradeType_status_idx" ON "Trade"("userId", "tradeType", "status");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppEvent" ADD CONSTRAINT "AppEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
