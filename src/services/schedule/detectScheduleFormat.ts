export type SchedulePdfFormat = "LINE" | "UNKNOWN";

/**
 * Heuristic: Saudia crew portal line schedule (PDF page-1 slice or full .txt).
 * CrewTool calendar exports are not supported in this build.
 */
export function detectScheduleFormat(text: string): SchedulePdfFormat {
  const collapsed = text.replace(/\s+/g, " ").trim();

  const hasLineHeader = /LINE\s*\d+/i.test(collapsed);
  const hasCreditBlock = /CR\.?\s*\d+|BLK\s*\d+/i.test(collapsed);
  const hasTripNumbers = /#\d+\s+REPORT/i.test(collapsed);

  if (hasLineHeader && hasCreditBlock && hasTripNumbers) {
    return "LINE";
  }

  return "UNKNOWN";
}
