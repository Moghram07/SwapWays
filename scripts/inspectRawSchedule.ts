import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { prisma } from "../src/lib/prisma";

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "rakanyaghmour1@gmail.com" },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!user) { console.log("User not found"); return; }
  console.log(`User: ${user.firstName} ${user.lastName} (${user.id})`);

  const schedule = await prisma.schedule.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, rawText: true },
  });
  if (!schedule) { console.log("No schedule found"); return; }
  console.log(`Schedule: ${schedule.id}  created: ${schedule.createdAt.toISOString().slice(0,10)}`);

  // Find the GVA trip block in the raw text
  const raw = schedule.rawText ?? "";
  const lines = raw.split(/\r?\n/);
  let inBlock = false;
  const blockLines: string[] = [];
  for (const line of lines) {
    if (/GVA|Geneva/i.test(line) && !inBlock) {
      // Search backwards for the trip header
      inBlock = true;
    }
    if (inBlock) {
      blockLines.push(line);
      if (/CREDIT:/i.test(line)) {
        // Found end of block
        break;
      }
      if (blockLines.length > 30) break; // safety
    }
  }

  // Always do the block-split approach to find all trips containing GVA as a leg airport
  console.log("\nSearching all trip blocks with GVA as a leg airport...\n");
  const tripBlocks = raw.split(/(?=#\d{3}\s+REPORT)/i).filter(b => b.trim().startsWith("#"));
  let found = 0;
  for (const b of tripBlocks) {
    // Check if GVA appears in a leg line (airport code surrounded by spaces)
    const legLines = b.split(/\r?\n/).filter(l => /^\s*(?:[A-Z]{2}\s+)?(?:DH)?\d{3,4}\s+\w+\s+\d{2}\.\d{2}/.test(l));
    const hasGVA = legLines.some(l => l.includes(" GVA ") || l.endsWith(" GVA") || l.includes("GVA "));
    if (hasGVA) {
      found++;
      console.log(`--- TRIP BLOCK (has GVA leg) ---`);
      console.log(b.trim());
      console.log("---\n");
    }
  }
  if (found === 0) {
    console.log("No trip blocks with GVA as a leg airport found.");
    console.log("Raw text length:", raw.length);
    // Show first 500 chars to check format
    console.log("First 500 chars:\n", raw.slice(0, 500));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
