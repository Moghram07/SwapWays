/**
 * Debug script: load Line 1300 PDF, extract text, run parser, log errors.
 * Run: node scripts/debug-pdf-upload.mjs
 * Or with PDF path: node scripts/debug-pdf-upload.mjs "path/to/Line 1300.pdf"
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

const pdfPath =
  process.argv[2] ||
  join(
    process.env.APPDATA || "",
    "Cursor",
    "User",
    "workspaceStorage",
    "0c1be5c5162679d8f90c61b3e03d5491",
    "pdfs",
    "60ec544e-5787-4e73-a243-45f3faa844ab",
    "Line 1300.pdf"
  );

async function main() {
  console.log("PDF path:", pdfPath);
  let buffer;
  try {
    buffer = readFileSync(pdfPath);
  } catch (e) {
    console.error("Could not read PDF:", e.message);
    console.log("Falling back to parsing RAW_TEXT from test...");
    const { parseScheduleFromText } = await import("../src/services/schedule/scheduleParser.ts");
    const { splitIntoSections } = await import("../src/services/schedule/sectionSplitter.ts");
    const RAW = `LINE1300 CR. 82.10 2 3 4 5: 6 7: 8 9 10 11 12: 13 14: 15 16 17 18 19: 20 21: 22 23 24 25 26: 27 28: 29 30 31 1 2: 3 4: 5
OFF  9    NO. DP'S 16                         003 030        227    : 157 099    294    : 082 330        259 409 107 : 479    558
#003 REPORT AT 22.55Z
SA 0383 33R 00.25 JED 02.45 CAI 02.20
Line No. 1300 (JED Economy Cabin Attendant 9 Z) Mar, 2026 PAGE 1 of 1`;
    const sections = splitIntoSections(RAW);
    console.log("Header lines:", sections.headerLines.length);
    console.log("Pairing blocks:", sections.pairingBlocks.length);
    const out = parseScheduleFromText(RAW, 3, 2026);
    console.log("Trips:", out.trips.length);
    return;
  }

  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  const rawText = data?.text || "";
  console.log("Extracted text length:", rawText.length);
  console.log("First 500 chars:\n", rawText.slice(0, 500));
  console.log("\n--- Sections ---");

  const { splitIntoSections } = await import("../src/services/schedule/sectionSplitter.ts");
  const sections = splitIntoSections(rawText);
  console.log("Header lines:", sections.headerLines.length);
  sections.headerLines.forEach((l, i) => console.log(`  ${i}: ${l.slice(0, 80)}...`));
  console.log("Pairing blocks:", sections.pairingBlocks.length);
  if (sections.pairingBlocks.length > 0) {
    console.log("First block (first 300 chars):", sections.pairingBlocks[0].slice(0, 300));
  }
  console.log("Footer:", sections.footerLine.slice(0, 100));

  console.log("\n--- Full parse ---");
  try {
    const { parseScheduleFromText } = await import("../src/services/schedule/scheduleParser.ts");
    const out = parseScheduleFromText(rawText);
    console.log("Trips:", out.trips.length);
    console.log("Line:", out.lineNumber, "Month/Year:", out.month, out.year);
  } catch (err) {
    console.error("Parse error:", err);
  }
}

main();
