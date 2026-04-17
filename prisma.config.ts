// Load .env first, then .env.local (override) so Prisma CLI uses same DB as Next.js
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { defineConfig } from "prisma/config";
import { prismaCliDatabaseUrl } from "./src/lib/prismaDatabaseUrl";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Uses DIRECT_URL when set (recommended for Supabase migrations); otherwise DATABASE_URL
    // with pooler-safe query params. See `src/lib/prismaDatabaseUrl.ts`.
    url: prismaCliDatabaseUrl(),
  },
});
