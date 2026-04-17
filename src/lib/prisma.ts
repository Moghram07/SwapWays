import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { ensurePgbouncerParamForPooler } from "@/lib/prismaDatabaseUrl";
import { assertProductionEnvSafety, getRequiredEnv } from "@/lib/env";

// Use a pooled DATABASE_URL (e.g. Supabase port 6543). `ensurePgbouncerParamForPooler` adds
// `pgbouncer=true` when needed so prepared statements work with the transaction pooler.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
assertProductionEnvSafety(["DATABASE_URL"]);
const connectionString = ensurePgbouncerParamForPooler(getRequiredEnv("DATABASE_URL"));

const adapter = new PrismaPg({ connectionString });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
