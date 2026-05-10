import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  extractFullPdfTextWithPdfParse,
  textForFormatDetection,
} from "../../src/services/schedule/pdfTextExtract";
import { detectScheduleFormat } from "../../src/services/schedule/detectScheduleFormat";

const FIXTURES = path.join(__dirname, "..", "fixtures", "schedules");
const LINE_PDF = path.join(FIXTURES, "line-1792.pdf");
/** Optional second PDF for extraction smoke (any fixture with a text layer). */
const OPTIONAL_PDF = path.join(FIXTURES, "calendar-2026-may.pdf");

describe("PDF extraction smoke (optional fixtures)", () => {
  it("extracts text and runs format check when line PDF fixture is present", async () => {
    if (!existsSync(LINE_PDF)) return;
    const buf = readFileSync(LINE_PDF);
    const full = await extractFullPdfTextWithPdfParse(buf);
    expect(full.length).toBeGreaterThan(20);
    const head = textForFormatDetection(full);
    expect(head.length).toBeGreaterThan(10);
    const fmt = detectScheduleFormat(head);
    expect(fmt === "LINE" || fmt === "UNKNOWN").toBe(true);
  });

  it("extracts text when optional second PDF fixture is present", async () => {
    if (!existsSync(OPTIONAL_PDF)) return;
    const buf = readFileSync(OPTIONAL_PDF);
    const full = await extractFullPdfTextWithPdfParse(buf);
    expect(full.length).toBeGreaterThan(50);
    expect(textForFormatDetection(full).length).toBeGreaterThan(10);
  });
});
