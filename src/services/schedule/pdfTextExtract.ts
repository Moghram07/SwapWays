/**
 * Page-scoped PDF text uses pdfjs-dist (Mozilla PDF.js) because pdf-parse does not
 * expose per-page text. Full-document extraction stays on pdf-parse for parity with
 * existing Saudia line schedules and faster extraction on typical 1-page line PDFs.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

let workerConfigured = false;

function ensurePdfWorker(): void {
  if (workerConfigured) return;
  const require = createRequire(import.meta.url);
  const pkgPath = require.resolve("pdfjs-dist/package.json");
  const worker = path.join(path.dirname(pkgPath), "legacy", "build", "pdf.worker.mjs");
  GlobalWorkerOptions.workerSrc = pathToFileURL(worker).href;
  workerConfigured = true;
}

async function textFromPage(pdf: PDFDocumentProxy, pageNumber: number): Promise<string> {
  if (pageNumber < 1 || pageNumber > pdf.numPages) return "";
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  const parts: string[] = [];
  for (const item of content.items) {
    if (item && typeof item === "object" && "str" in item && typeof (item as { str: string }).str === "string") {
      parts.push((item as { str: string }).str);
    }
  }
  return parts.join(" ");
}

/**
 * Extract plain text from a single 1-based page index (for format detection).
 */
export async function extractPageText(buffer: Buffer, pageNumber: number): Promise<string> {
  ensurePdfWorker();
  const data = new Uint8Array(buffer);
  const loadingTask = getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;
  return textFromPage(pdf, pageNumber);
}

/**
 * Extract all pages via PDF.js (same engine as page-1). Use when you need consistent
 * pdfjs token order for calendar PDFs; otherwise prefer extractFullPdfTextWithPdfParse.
 */
export async function extractFullPdfTextWithPdfJs(buffer: Buffer): Promise<string> {
  ensurePdfWorker();
  const data = new Uint8Array(buffer);
  const pdf = await getDocument({ data, useSystemFonts: true, disableFontFace: true }).promise;
  const chunks: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    chunks.push(await textFromPage(pdf, p));
    chunks.push("\n");
  }
  return chunks.join("").trim();
}

/** Existing line pipeline: whole-document text via pdf-parse. */
export async function extractFullPdfTextWithPdfParse(buffer: Buffer): Promise<string> {
  const pdfModule = await import("pdf-parse");
  const pdfParse = pdfModule.default ?? pdfModule;
  const data = await pdfParse(buffer);
  return (data && typeof data === "object" && "text" in data ? (data as { text: string }).text : "") || "";
}
