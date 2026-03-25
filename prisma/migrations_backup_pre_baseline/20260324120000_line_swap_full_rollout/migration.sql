DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LineType') THEN
    CREATE TYPE "LineType" AS ENUM ('NORMAL', 'US_LINE', 'CHINA_LINE', 'RESERVE_LINE');
  END IF;
END
$$;

ALTER TABLE "LineSwapPost"
ADD COLUMN IF NOT EXISTS "reserveDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN IF NOT EXISTS "wantDestination" TEXT;

UPDATE "LineSwapPost"
SET "wantDestination" = CASE
  WHEN "wantDestinations" IS NULL OR cardinality("wantDestinations") = 0 THEN NULL
  ELSE "wantDestinations"[1]
END
WHERE "wantDestination" IS NULL;

ALTER TABLE "LineSwapPost"
ALTER COLUMN "lineType" TYPE "LineType"
USING (
  CASE
    WHEN "lineType" IS NULL OR btrim("lineType") = '' THEN 'NORMAL'::"LineType"
    WHEN upper("lineType") IN ('NORMAL') THEN 'NORMAL'::"LineType"
    WHEN upper("lineType") IN ('US_LINE', 'US', 'AMERICA', 'USA') THEN 'US_LINE'::"LineType"
    WHEN upper("lineType") IN ('CHINA_LINE', 'CHINA') THEN 'CHINA_LINE'::"LineType"
    WHEN upper("lineType") IN ('RESERVE_LINE', 'RESERVE', 'RR') THEN 'RESERVE_LINE'::"LineType"
    ELSE 'NORMAL'::"LineType"
  END
),
ALTER COLUMN "lineType" SET DEFAULT 'NORMAL',
ALTER COLUMN "lineType" SET NOT NULL;

ALTER TABLE "LineSwapPost"
ALTER COLUMN "wantLineType" TYPE "LineType"
USING (
  CASE
    WHEN "wantLineType" IS NULL OR btrim("wantLineType") = '' THEN NULL
    WHEN upper("wantLineType") IN ('NORMAL') THEN 'NORMAL'::"LineType"
    WHEN upper("wantLineType") IN ('US_LINE', 'US', 'AMERICA', 'USA') THEN 'US_LINE'::"LineType"
    WHEN upper("wantLineType") IN ('CHINA_LINE', 'CHINA') THEN 'CHINA_LINE'::"LineType"
    WHEN upper("wantLineType") IN ('RESERVE_LINE', 'RESERVE', 'RR') THEN 'RESERVE_LINE'::"LineType"
    ELSE NULL
  END
);

ALTER TABLE "LineSwapPost"
DROP COLUMN IF EXISTS "wantDestinations";
