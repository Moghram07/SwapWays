import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local", override: true });

const client = new Client({ connectionString: process.env.DATABASE_URL });

const statements = [
  `
DO $$
BEGIN
  CREATE TYPE "UserTier" AS ENUM ('FREE', 'PREMIUM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
`,
  `
DO $$
BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tier" "UserTier"`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialStartedAt" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionStatus" "SubscriptionStatus"`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscribedAt" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionRenewsAt" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3)`,
  `
UPDATE "User"
SET
  "trialStartedAt" = COALESCE("trialStartedAt", "createdAt"),
  "trialEndsAt" = COALESCE("trialEndsAt", "createdAt" + INTERVAL '90 days'),
  "tier" = COALESCE(
    "tier",
    CASE
      WHEN ("createdAt" + INTERVAL '90 days') > NOW() THEN 'PREMIUM'::"UserTier"
      ELSE 'FREE'::"UserTier"
    END
  ),
  "subscriptionStatus" = COALESCE(
    "subscriptionStatus",
    CASE
      WHEN ("createdAt" + INTERVAL '90 days') > NOW() THEN 'TRIALING'::"SubscriptionStatus"
      ELSE 'EXPIRED'::"SubscriptionStatus"
    END
  )
`,
  `ALTER TABLE "User" ALTER COLUMN "tier" SET DEFAULT 'PREMIUM'`,
  `ALTER TABLE "User" ALTER COLUMN "trialStartedAt" SET DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE "User" ALTER COLUMN "trialEndsAt" SET DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE "User" ALTER COLUMN "subscriptionStatus" SET DEFAULT 'TRIALING'`,
  `ALTER TABLE "User" ALTER COLUMN "tier" SET NOT NULL`,
  `ALTER TABLE "User" ALTER COLUMN "trialStartedAt" SET NOT NULL`,
  `ALTER TABLE "User" ALTER COLUMN "trialEndsAt" SET NOT NULL`,
  `ALTER TABLE "User" ALTER COLUMN "subscriptionStatus" SET NOT NULL`,
  `CREATE INDEX IF NOT EXISTS "User_subscriptionStatus_trialEndsAt_idx" ON "User"("subscriptionStatus", "trialEndsAt")`,
];

try {
  await client.connect();
  for (const sql of statements) {
    await client.query(sql);
    console.log("OK");
  }
  console.log("Subscription schema sync complete.");
} finally {
  await client.end();
}
