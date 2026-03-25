-- Add ScheduleTrip columns (endDate, tripType, routeType) and ScheduleTripLayover table.
-- Safe to run when columns/table already exist (uses DO blocks and IF NOT EXISTS).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TripType') THEN
    CREATE TYPE "TripType" AS ENUM ('LAYOVER', 'TURNAROUND', 'MULTI_STOP');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RouteType') THEN
    CREATE TYPE "RouteType" AS ENUM ('DOMESTIC', 'INTERNATIONAL');
  END IF;
END $$;

ALTER TABLE "ScheduleTrip" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "ScheduleTrip" ADD COLUMN IF NOT EXISTS "tripType" "TripType";
ALTER TABLE "ScheduleTrip" ADD COLUMN IF NOT EXISTS "routeType" "RouteType";

UPDATE "ScheduleTrip" SET "endDate" = "startDate" WHERE "endDate" IS NULL;
UPDATE "ScheduleTrip" SET "tripType" = 'TURNAROUND' WHERE "tripType" IS NULL;
UPDATE "ScheduleTrip" SET "routeType" = 'DOMESTIC' WHERE "routeType" IS NULL;

ALTER TABLE "ScheduleTrip" ALTER COLUMN "endDate" SET NOT NULL;
ALTER TABLE "ScheduleTrip" ALTER COLUMN "tripType" SET NOT NULL;
ALTER TABLE "ScheduleTrip" ALTER COLUMN "tripType" SET DEFAULT 'TURNAROUND';
ALTER TABLE "ScheduleTrip" ALTER COLUMN "routeType" SET NOT NULL;
ALTER TABLE "ScheduleTrip" ALTER COLUMN "routeType" SET DEFAULT 'DOMESTIC';

CREATE TABLE IF NOT EXISTS "ScheduleTripLayover" (
  "id" TEXT NOT NULL,
  "scheduleTripId" TEXT NOT NULL,
  "airport" TEXT NOT NULL,
  "durationRaw" TEXT NOT NULL,
  "durationDecimal" DOUBLE PRECISION NOT NULL,
  "afterLegOrder" INTEGER NOT NULL,
  CONSTRAINT "ScheduleTripLayover_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ScheduleTripLayover" DROP CONSTRAINT IF EXISTS "ScheduleTripLayover_scheduleTripId_fkey";
ALTER TABLE "ScheduleTripLayover" ADD CONSTRAINT "ScheduleTripLayover_scheduleTripId_fkey"
  FOREIGN KEY ("scheduleTripId") REFERENCES "ScheduleTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
