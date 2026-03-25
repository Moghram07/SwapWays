-- CreateEnum
CREATE TYPE "LineType" AS ENUM ('NORMAL', 'US_LINE', 'CHINA_LINE', 'RESERVE_LINE');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "lineSwapPostId" TEXT;

-- CreateTable
CREATE TABLE "LineSwapPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lineNumber" TEXT NOT NULL,
    "lineType" "LineType" NOT NULL DEFAULT 'NORMAL',
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalBlock" DOUBLE PRECISION,
    "daysOffStart" INTEGER NOT NULL,
    "daysOffEnd" INTEGER NOT NULL,
    "hasReserve" BOOLEAN NOT NULL DEFAULT false,
    "reserveDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "wantDaysOffStart" INTEGER,
    "wantDaysOffEnd" INTEGER,
    "wantDestination" TEXT,
    "wantLineType" "LineType",
    "wantNoReserve" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "scheduleId" TEXT,
    "status" "SwapPostStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineSwapPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineSwapLayover" (
    "id" TEXT NOT NULL,
    "lineSwapPostId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "durationHours" DOUBLE PRECISION NOT NULL,
    "durationRaw" TEXT NOT NULL,

    CONSTRAINT "LineSwapLayover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LineSwapPost_userId_idx" ON "LineSwapPost"("userId");

-- CreateIndex
CREATE INDEX "LineSwapPost_status_createdAt_idx" ON "LineSwapPost"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LineSwapLayover_lineSwapPostId_idx" ON "LineSwapLayover"("lineSwapPostId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_lineSwapPostId_initiatorId_key" ON "Conversation"("lineSwapPostId", "initiatorId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_lineSwapPostId_fkey" FOREIGN KEY ("lineSwapPostId") REFERENCES "LineSwapPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineSwapPost" ADD CONSTRAINT "LineSwapPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineSwapPost" ADD CONSTRAINT "LineSwapPost_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineSwapLayover" ADD CONSTRAINT "LineSwapLayover_lineSwapPostId_fkey" FOREIGN KEY ("lineSwapPostId") REFERENCES "LineSwapPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
