export type SchedulePdfFormat = "LINE" | "CALENDAR" | "UNKNOWN";

/**
 * Heuristic detection on page-1 (PDF) or full text (.txt uploads).
 * Calendar = CrewTool weekly grid; Line = Saudia portal line schedule.
 */
export function detectScheduleFormat(text: string): SchedulePdfFormat {
  const collapsed = text.replace(/\s+/g, " ").trim();

  const hasCalendarHeaders =
    /Sunday.+Monday.+Tuesday.+Wednesday.+Thursday.+Friday.+Saturday/i.test(collapsed) ||
    /\bSun\b.+\bMon\b.+\bTue\b.+\bWed\b.+\bThu\b.+\bFri\b.+\bSat\b/i.test(collapsed);

  const hasReportRelease = /\bReport\b/i.test(text) && /\bRelease\b/i.test(text);
  const hasHotelMarker = /\bHotel\b/i.test(text);

  if (hasCalendarHeaders && hasReportRelease && hasHotelMarker) {
    return "CALENDAR";
  }

  const hasLineHeader = /LINE\s*\d+/i.test(text);
  const hasCreditBlock = /CR\.?\s*\d+|BLK\s*\d+/i.test(text);
  const hasTripNumbers = /#\d+\s+REPORT/i.test(text);

  if (hasLineHeader && hasCreditBlock && hasTripNumbers) {
    return "LINE";
  }

  return "UNKNOWN";
}
