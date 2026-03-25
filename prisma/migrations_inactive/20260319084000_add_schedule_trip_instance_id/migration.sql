ALTER TABLE "ScheduleTrip"
ADD COLUMN "instanceId" TEXT NOT NULL DEFAULT '';

UPDATE "ScheduleTrip"
SET "instanceId" = "tripNumber"
WHERE "instanceId" = '';

ALTER TABLE "ScheduleTrip"
ALTER COLUMN "instanceId" DROP DEFAULT;

CREATE UNIQUE INDEX "ScheduleTrip_scheduleId_instanceId_key"
ON "ScheduleTrip"("scheduleId", "instanceId");
