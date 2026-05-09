import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { extractPageText, extractFullPdfTextWithPdfJs } from "../../src/services/schedule/pdfTextExtract";
import { detectScheduleFormat } from "../../src/services/schedule/detectScheduleFormat";

const FIXTURES = path.join(__dirname, "..", "fixtures", "schedules");
const LINE_PDF = path.join(FIXTURES, "line-1792.pdf");
const CAL_PDF = path.join(FIXTURES, "calendar-2026-may.pdf");

describe("PDF extraction smoke (optional fixtures)", () => {
  it("reads page 1 and classifies line fixture when present", async () => {
    if (!existsSync(LINE_PDF)) return;
    const buf = readFileSync(LINE_PDF);
    const p1 = await extractPageText(buf, 1);
    expect(p1.length).toBeGreaterThan(20);
    const fmt = detectScheduleFormat(p1);
    expect(fmt === "LINE" || fmt === "UNKNOWN").toBe(true);
  });

  it("reads full CrewTool-style PDF when present", async () => {
    if (!existsSync(CAL_PDF)) return;
    const buf = readFileSync(CAL_PDF);
    const full = await extractFullPdfTextWithPdfJs(buf);
    expect(full.length).toBeGreaterThan(50);
  });
});
