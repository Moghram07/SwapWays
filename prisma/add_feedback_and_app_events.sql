-- Admin inbox + analytics event storage (PostgreSQL)
-- Safe to run before enabling admin dashboard features.

DO $$ BEGIN
  CREATE TYPE "FeedbackType" AS ENUM ('REQUEST', 'QUESTION', 'SUGGESTION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FeedbackPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Feedback" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" "FeedbackType" NOT NULL,
  "status" "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "FeedbackPriority" NOT NULL DEFAULT 'NORMAL',
  "subject" TEXT,
  "message" TEXT NOT NULL,
  "adminNote" TEXT,
  "assigneeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Feedback_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AppEvent" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "anonymousId" TEXT,
  "eventName" TEXT NOT NULL,
  "path" TEXT,
  "properties" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Feedback_userId_createdAt_idx" ON "Feedback"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Feedback_status_createdAt_idx" ON "Feedback"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Feedback_type_createdAt_idx" ON "Feedback"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "Feedback_assigneeId_status_idx" ON "Feedback"("assigneeId", "status");

CREATE INDEX IF NOT EXISTS "AppEvent_eventName_createdAt_idx" ON "AppEvent"("eventName", "createdAt");
CREATE INDEX IF NOT EXISTS "AppEvent_userId_createdAt_idx" ON "AppEvent"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AppEvent_path_createdAt_idx" ON "AppEvent"("path", "createdAt");
