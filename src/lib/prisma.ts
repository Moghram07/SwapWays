import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { assertProductionEnvSafety, getRequiredEnv } from "@/lib/env";

// Use a pooled DATABASE_URL (e.g. Supabase port 6543) and ?connection_limit=10 to avoid
// "connection forcibly closed by the remote host" (code 10054) after actions like canceling a swap.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
assertProductionEnvSafety(["DATABASE_URL"]);
const connectionString = getRequiredEnv("DATABASE_URL");

const adapter = new PrismaPg({ connectionString });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
