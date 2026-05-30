import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { prisma } from "../src/lib/prisma";

async function main() {
  const email = process.argv[2];
  const dest = process.argv[3] ?? "ISB";
  if (!email) { console.error("Usage: tsx scripts/inspectRawByEmail.ts <email> [dest]"); process.exit(1); }

  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, firstName: true },
  });
  if (!user) { console.log("User not found"); return; }

  const schedule = await prisma.schedule.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, rawText: true },
  });
  if (!schedule) { console.log("No schedule found"); return; }
  console.log(`Schedule ${schedule.id} created ${schedule.createdAt.toISOString().slice(0,10)}\n`);

  const raw = schedule.rawText ?? "";
  const tripBlocks = raw.split(/(?=#\d{3}\s+REPORT)/i).filter(b => b.trim().startsWith("#"));
  let found = 0;
  for (const b of tripBlocks) {
    const legLines = b.split(/\r?\n/).filter(l => /^\s*(?:[A-Z]{2}\s+)?(?:DH)?\d{3,4}\s+\w+\s+\d{2}\.\d{2}/.test(l));
    const hasDest = legLines.some(l => l.includes(` ${dest} `) || l.includes(` ${dest}\n`) || l.endsWith(` ${dest}`));
    if (hasDest) {
      found++;
      console.log(`--- TRIP BLOCK (dest: ${dest}) ---`);
      console.log(b.trim());
      console.log("---\n");
    }
  }
  if (found === 0) console.log(`No trip blocks with ${dest} as a leg airport found.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
