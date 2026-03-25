-- Add scheduleTripId to Trade if missing (nullable, unique).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Trade' AND column_name = 'scheduleTripId'
  ) THEN
    ALTER TABLE "Trade" ADD COLUMN "scheduleTripId" TEXT UNIQUE;
    ALTER TABLE "Trade" ADD CONSTRAINT "Trade_scheduleTripId_fkey"
      FOREIGN KEY ("scheduleTripId") REFERENCES "ScheduleTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
