// Load .env first, then .env.local (override) so Prisma CLI uses same DB as Next.js
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
