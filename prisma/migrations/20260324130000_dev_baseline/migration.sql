-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CrewCategory" AS ENUM ('CABIN', 'FLIGHT_DECK');

-- CreateEnum
CREATE TYPE "TradeType" AS ENUM ('FLIGHT_SWAP', 'VACATION_SWAP');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('OPEN', 'MATCHED', 'ACCEPTED', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('LAYOVER', 'TURNAROUND', 'MULTI_STOP');

-- CreateEnum
CREATE TYPE "SwapPostType" AS ENUM ('OFFERING_TRIPS', 'OFFERING_DAYS_OFF', 'GIVING_AWAY', 'LOOKING_FOR', 'VACATION_SWAP');

-- CreateEnum
CREATE TYPE "SwapPostStatus" AS ENUM ('OPEN', 'IN_NEGOTIATION', 'AGREED', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WantType" AS ENUM ('LAYOVER', 'LONGER_LAYOVER', 'ROUND_TRIP', 'ANY_FLIGHT', 'DAYS_OFF', 'ANYTHING', 'SPECIFIC');

-- CreateEnum
CREATE TYPE "RouteType" AS ENUM ('DOMESTIC', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "LineType" AS ENUM ('NORMAL', 'US_LINE', 'CHINA_LINE', 'RESERVE_LINE');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MATCH_FOUND', 'MATCH_ACCEPTED', 'MATCH_REJECTED', 'TRADE_EXPIRED', 'NEW_MESSAGE', 'SWAP_PROPOSED', 'SWAP_ACCEPTED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'SWAP_PROPOSED', 'SWAP_ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'SYSTEM', 'TRIP_OFFER');

-- CreateEnum
CREATE TYPE "SystemAction" AS ENUM ('SWAP_PROPOSED', 'SWAP_ACCEPTED', 'SWAP_DECLINED', 'TRIP_OFFERED', 'TRIP_CHANGED', 'CONVERSATION_CLOSED');

-- CreateEnum
CREATE TYPE "SwapRuleType" AS ENUM ('OVERTIME_LIMIT', 'NO_PARTIAL_TRADE', 'DOMESTIC_RESTRICTION', 'QUALIFICATION_MISMATCH', 'BASE_MISMATCH', 'RANK_MISMATCH', 'REST_VIOLATION', 'SCHEDULE_CONFLICT');

-- CreateTable
CREATE TABLE "Airline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "emailDomain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Airline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rank" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" "CrewCategory" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "airlineId" TEXT NOT NULL,

    CONSTRAINT "Rank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AircraftType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "scheduleCode" TEXT,
    "airlineId" TEXT NOT NULL,

    CONSTRAINT "AircraftType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Base" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "airportCode" TEXT NOT NULL,
    "airlineId" TEXT NOT NULL,

    CONSTRAINT "Base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwapRule" (
    "id" TEXT NOT NULL,
    "ruleType" "SwapRuleType" NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "airlineId" TEXT NOT NULL,

    CONSTRAINT "SwapRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "crewId" TEXT NOT NULL,
    "airlineId" TEXT NOT NULL,
    "rankId" TEXT NOT NULL,
    "baseId" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "hasUsVisa" BOOLEAN NOT NULL DEFAULT false,
    "hasChinaVisa" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserQualification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "aircraftTypeId" TEXT NOT NULL,

    CONSTRAINT "UserQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scheduleTripId" TEXT,
    "tradeType" "TradeType" NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "tripNumber" TEXT,
    "flightNumber" TEXT,
    "aircraftTypeCode" TEXT,
    "destination" TEXT,
    "departureDate" TIMESTAMP(3),
    "reportTime" TEXT,
    "departureTime" TEXT,
    "arrivalTime" TEXT,
    "flyingTime" DOUBLE PRECISION,
    "layoverDuration" DOUBLE PRECISION,
    "creditHours" DOUBLE PRECISION,
    "blockHours" DOUBLE PRECISION,
    "tafb" DOUBLE PRECISION,
    "desiredDestinations" TEXT[],
    "wtfDays" INTEGER[],
    "preferMinCredit" DOUBLE PRECISION,
    "preferMaxCredit" DOUBLE PRECISION,
    "notes" TEXT,
    "vacationStartDate" TIMESTAMP(3),
    "vacationEndDate" TIMESTAMP(3),
    "desiredVacationStart" TIMESTAMP(3),
    "desiredVacationEnd" TIMESTAMP(3),

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "vacationStartDate" TIMESTAMP(3),
    "vacationEndDate" TIMESTAMP(3),
    "desiredVacationStart" TIMESTAMP(3),
    "desiredVacationEnd" TIMESTAMP(3),
    "vacationYear" INTEGER,
    "vacationMonth" INTEGER,
    "vacationStartDay" INTEGER,
    "vacationEndDay" INTEGER,
    "desiredVacationMonths" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "SwapPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "offererId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lineNumber" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalCredit" DOUBLE PRECISION,
    "totalBlock" DOUBLE PRECISION,
    "daysOff" INTEGER,
    "dutyPeriods" INTEGER,
    "rawText" TEXT,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleTrip" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "tripNumber" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "reportTime" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "tripType" "TripType" NOT NULL,
    "creditHours" DOUBLE PRECISION NOT NULL,
    "blockHours" DOUBLE PRECISION NOT NULL,
    "tafb" DOUBLE PRECISION NOT NULL,
    "routeType" "RouteType" NOT NULL,

    CONSTRAINT "ScheduleTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleTripLayover" (
    "id" TEXT NOT NULL,
    "scheduleTripId" TEXT NOT NULL,
    "airport" TEXT NOT NULL,
    "durationRaw" TEXT NOT NULL,
    "durationDecimal" DOUBLE PRECISION NOT NULL,
    "afterLegOrder" INTEGER NOT NULL,

    CONSTRAINT "ScheduleTripLayover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleTripLeg" (
    "id" TEXT NOT NULL,
    "scheduleTripId" TEXT NOT NULL,
    "legOrder" INTEGER NOT NULL,
    "dayOfWeek" TEXT,
    "flightNumber" TEXT NOT NULL,
    "aircraftTypeCode" TEXT NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "departureTime" TEXT NOT NULL,
    "departureAirport" TEXT NOT NULL,
    "arrivalDate" TIMESTAMP(3) NOT NULL,
    "arrivalTime" TEXT NOT NULL,
    "arrivalAirport" TEXT NOT NULL,
    "flyingTimeRaw" TEXT,
    "flyingTime" DOUBLE PRECISION NOT NULL,
    "layoverDuration" DOUBLE PRECISION,
    "layoverAirport" TEXT,

    CONSTRAINT "ScheduleTripLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT,
    "initiatorId" TEXT NOT NULL,
    "tradeOwnerId" TEXT,
    "offeredTripId" TEXT,
    "swapPostId" TEXT,
    "lineSwapPostId" TEXT,
    "postOwnerId" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "ConversationOffer" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "scheduleTripId" TEXT NOT NULL,

    CONSTRAINT "ConversationOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',
    "systemAction" "SystemAction",
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Airline_name_key" ON "Airline"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Airline_code_key" ON "Airline"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Airline_emailDomain_key" ON "Airline"("emailDomain");

-- CreateIndex
CREATE UNIQUE INDEX "Rank_airlineId_code_key" ON "Rank"("airlineId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "AircraftType_airlineId_code_key" ON "AircraftType"("airlineId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Base_airlineId_airportCode_key" ON "Base"("airlineId", "airportCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_airlineId_crewId_key" ON "User"("airlineId", "crewId");

-- CreateIndex
CREATE UNIQUE INDEX "UserQualification_userId_aircraftTypeId_key" ON "UserQualification"("userId", "aircraftTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_scheduleTripId_key" ON "Trade"("scheduleTripId");

-- CreateIndex
CREATE INDEX "SwapPost_userId_idx" ON "SwapPost"("userId");

-- CreateIndex
CREATE INDEX "SwapPost_status_idx" ON "SwapPost"("status");

-- CreateIndex
CREATE INDEX "SwapPost_postType_idx" ON "SwapPost"("postType");

-- CreateIndex
CREATE INDEX "SwapPost_status_createdAt_idx" ON "SwapPost"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SwapPost_userId_createdAt_idx" ON "SwapPost"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SwapPostTrip_swapPostId_idx" ON "SwapPostTrip"("swapPostId");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_userId_month_year_key" ON "Schedule"("userId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleTrip_scheduleId_instanceId_key" ON "ScheduleTrip"("scheduleId", "instanceId");

-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_tradeId_initiatorId_key" ON "Conversation"("tradeId", "initiatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_swapPostId_initiatorId_key" ON "Conversation"("swapPostId", "initiatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_lineSwapPostId_initiatorId_key" ON "Conversation"("lineSwapPostId", "initiatorId");

-- CreateIndex
CREATE INDEX "LineSwapPost_userId_idx" ON "LineSwapPost"("userId");

-- CreateIndex
CREATE INDEX "LineSwapPost_status_createdAt_idx" ON "LineSwapPost"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LineSwapLayover_lineSwapPostId_idx" ON "LineSwapLayover"("lineSwapPostId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationOffer_conversationId_scheduleTripId_key" ON "ConversationOffer"("conversationId", "scheduleTripId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- AddForeignKey
ALTER TABLE "Rank" ADD CONSTRAINT "Rank_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftType" ADD CONSTRAINT "AircraftType_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Base" ADD CONSTRAINT "Base_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapRule" ADD CONSTRAINT "SwapRule_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "Rank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "Base"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQualification" ADD CONSTRAINT "UserQualification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQualification" ADD CONSTRAINT "UserQualification_aircraftTypeId_fkey" FOREIGN KEY ("aircraftTypeId") REFERENCES "AircraftType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_scheduleTripId_fkey" FOREIGN KEY ("scheduleTripId") REFERENCES "ScheduleTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapPost" ADD CONSTRAINT "SwapPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapPostTrip" ADD CONSTRAINT "SwapPostTrip_swapPostId_fkey" FOREIGN KEY ("swapPostId") REFERENCES "SwapPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapPostTrip" ADD CONSTRAINT "SwapPostTrip_scheduleTripId_fkey" FOREIGN KEY ("scheduleTripId") REFERENCES "ScheduleTrip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_offererId_fkey" FOREIGN KEY ("offererId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTrip" ADD CONSTRAINT "ScheduleTrip_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTripLayover" ADD CONSTRAINT "ScheduleTripLayover_scheduleTripId_fkey" FOREIGN KEY ("scheduleTripId") REFERENCES "ScheduleTrip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTripLeg" ADD CONSTRAINT "ScheduleTripLeg_scheduleTripId_fkey" FOREIGN KEY ("scheduleTripId") REFERENCES "ScheduleTrip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tradeOwnerId_fkey" FOREIGN KEY ("tradeOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_offeredTripId_fkey" FOREIGN KEY ("offeredTripId") REFERENCES "ScheduleTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_swapPostId_fkey" FOREIGN KEY ("swapPostId") REFERENCES "SwapPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_lineSwapPostId_fkey" FOREIGN KEY ("lineSwapPostId") REFERENCES "LineSwapPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_postOwnerId_fkey" FOREIGN KEY ("postOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineSwapPost" ADD CONSTRAINT "LineSwapPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineSwapPost" ADD CONSTRAINT "LineSwapPost_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineSwapLayover" ADD CONSTRAINT "LineSwapLayover_lineSwapPostId_fkey" FOREIGN KEY ("lineSwapPostId") REFERENCES "LineSwapPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationOffer" ADD CONSTRAINT "ConversationOffer_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationOffer" ADD CONSTRAINT "ConversationOffer_scheduleTripId_fkey" FOREIGN KEY ("scheduleTripId") REFERENCES "ScheduleTrip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
