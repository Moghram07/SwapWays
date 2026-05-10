import { createRequire } from "node:module";

/**
 * Schedule PDFs: extract text with **pdf-parse** only (Node-friendly for Next.js API routes).
 *
 * Load via `createRequire` so Next does not rewrite pdf-parse’s internal `require("./pdf.js/...")`.
 */
const requirePdfParse = createRequire(import.meta.url);

type PdfParseResult = { text?: string };

export async function extractFullPdfTextWithPdfParse(buffer: Buffer): Promise<string> {
  const pdfParse = requirePdfParse("pdf-parse") as (data: Buffer) => Promise<PdfParseResult>;
  const data = await pdfParse(buffer);
  return (data && typeof data === "object" && "text" in data ? data.text : "") || "";
}

/**
 * Text for format detection: first page when form-feed separated, else a head slice
 * for very long documents.
 */
export function textForFormatDetection(fullText: string): string {
  return firstPageOrHead(fullText);
}

function firstPageOrHead(full: string): string {
  const i = full.indexOf("\f");
  if (i !== -1) return full.slice(0, i).trim();
  if (full.length <= 25_000) return full.trim();
  return full.slice(0, 15_000).trim();
}
