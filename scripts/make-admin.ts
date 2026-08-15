/**
 * Promote a user to admin (sets User.isAdmin = true) by email.
 *
 * Read-only check:  npx tsx scripts/make-admin.ts <email>
 * Apply the change: npx tsx scripts/make-admin.ts <email> --apply
 *
 * Loads DATABASE_URL from .env.local so it targets the configured (production) DB.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local into process.env (standalone scripts don't get Next's auto-load).
function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    // ignore; rely on existing env
  }
}

async function main() {
  loadEnvLocal();
  const { prisma } = await import("../src/lib/prisma");
  const email = process.argv[2]?.trim().toLowerCase();
  const apply = process.argv.includes("--apply");
  if (!email) {
    console.error("Usage: npx tsx scripts/make-admin.ts <email> [--apply]");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, firstName: true, lastName: true, isAdmin: true },
  });

  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  console.log("Found user:", user);

  if (user.isAdmin) {
    console.log("Already an admin — nothing to do.");
    return;
  }

  if (!apply) {
    console.log("\nDRY RUN. Re-run with --apply to set isAdmin = true.");
    return;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isAdmin: true },
    select: { id: true, email: true, isAdmin: true },
  });
  console.log("Updated:", updated);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
