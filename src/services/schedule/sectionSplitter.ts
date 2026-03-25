/**
 * Split raw schedule text into header (calendar grid), pairing blocks, and footer.
 * Normalizes PDF-extracted text where newlines may be missing.
 */

export interface ScheduleSections {
  headerLines: string[];
  pairingBlocks: string[];
  footerLine: string;
}

/**
 * PDF extractors often merge lines. Insert newlines before known schedule patterns
 * so we can split into logical lines even when the PDF has no line breaks.
 */
function normalizePdfText(raw: string): string {
  let text = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  // Insert newline before trip header (#NNN REPORT)
  text = text.replace(/\s+(#\d{3}\s+REPORT\s)/gi, "\n$1");
  // Insert newline before leg line (DAY + 4-digit flight)
  text = text.replace(/\s+((?:MO|TU|WE|TH|FR|SA|SU)\s+\d{4}\s+\w{3,4}\s+\d{2}\.\d{2})/g, "\n$1");
  // Insert newline before LAYOVER and CREDIT
  text = text.replace(/\s+(LAYOVER\s)/gi, "\n$1");
  text = text.replace(/\s+(CREDIT:\s)/gi, "\n$1");
  text = text.replace(/\s+(Line\s+No\.)/gi, "\n$1");
  return text;
}

/**
 * Split by newlines, then:
 * - First 5 non-empty lines (or lines that look like grid) = header
 * - Split remaining by #NNN pattern to get pairing blocks
 * - Last line starting with "Line No." or similar = footer
 */
export function splitIntoSections(rawText: string): ScheduleSections {
  const normalized = normalizePdfText(rawText);
  const lines = normalized.split(/\n/).map((l) => l.trim());
  const nonEmpty = lines.filter((l) => l.length > 0);

  let headerEnd = 0;
  const headerLines: string[] = [];
  for (let i = 0; i < Math.min(10, nonEmpty.length); i++) {
    const line = nonEmpty[i]!;
    if (line.match(/^LINE\s*\d+/i) || line.match(/^\s*(\d{1,2}\s+){5,}/) || line.match(/^\s*(MO|TU|WE|TH|FR|SA|SU)(\s+(MO|TU|WE|TH|FR|SA|SU))+/i) || line.match(/OFF\s+\d+/i) || line.match(/TAI\s+[\d.]+/i) || line.match(/TAR\s+[\d.]+/i)) {
      headerLines.push(line);
      headerEnd = i + 1;
      if (headerLines.length >= 5) break;
    } else if (headerLines.length > 0) {
      break;
    }
  }

  // If we didn't get 5 header lines, take first 5 non-empty
  if (headerLines.length < 5 && nonEmpty.length >= 5) {
    headerLines.length = 0;
    for (let i = 0; i < 5; i++) headerLines.push(nonEmpty[i]!);
    headerEnd = 5;
  }

  const rest = nonEmpty.slice(headerEnd);
  const pairingBlocks: string[] = [];
  let currentBlock: string[] = [];
  const tripStart = /^#\d{3}\s+REPORT/i;

  for (const line of rest) {
    if (tripStart.test(line)) {
      if (currentBlock.length > 0) {
        pairingBlocks.push(currentBlock.join("\n"));
        currentBlock = [];
      }
      currentBlock.push(line);
    } else if (currentBlock.length > 0 && (line.match(/^(MO|TU|WE|TH|FR|SA|SU)\s+\d{4}/i) || line.match(/LAYOVER/i) || line.match(/CREDIT:/i) || line.match(/^\s*$/))) {
      currentBlock.push(line);
    } else if (currentBlock.length > 0) {
      const trimmed = line.trim();
      if (trimmed.length > 0) currentBlock.push(line);
      else {
        pairingBlocks.push(currentBlock.join("\n"));
        currentBlock = [];
      }
    }
  }
  if (currentBlock.length > 0) pairingBlocks.push(currentBlock.join("\n"));

  let footerLine = "";
  const footerIdx = nonEmpty.findIndex((l) => /Line\s+No\./i.test(l) || /PAGE\s+\d+\s+of/i.test(l));
  if (footerIdx >= 0) footerLine = nonEmpty[footerIdx]!;

  return { headerLines, pairingBlocks, footerLine };
}
