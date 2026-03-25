/**
 * Parse footer line for base, crew type, month, year.
 * Example: "Line No. 1300 (JEDEconomyCabinAttendant 9 Z) Mar, 2026 PAGE 1 of 1"
 */

export interface ScheduleFooter {
  lineNumber: string;
  base: string;
  crewType: string;
  scheduleCode: string;
  month: number;
  year: number;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export function parseFooterLine(line: string): ScheduleFooter | null {
  if (!line || line.trim().length === 0) return null;

  let lineNumber = "0";
  const lineMatch = line.match(/Line\s+No\.?\s*(\d+)/i);
  if (lineMatch) lineNumber = lineMatch[1]!;

  let base = "JED";
  const parenMatch = line.match(/\(\s*([A-Z]{3})/i);
  if (parenMatch) base = parenMatch[1]!.toUpperCase();

  let crewType = "";
  const crewMatch = line.match(/\([A-Z]{3}([A-Za-z]+)\s+\d/i);
  if (crewMatch) crewType = crewMatch[1]!.trim();

  let scheduleCode = "";
  const codeMatch = line.match(/Attendant\s+([\dA-Z]+)\s*\)/i) || line.match(/\)\s*([\dA-Z\s]+)\s*[A-Z][a-z]+/i);
  if (codeMatch) scheduleCode = codeMatch[1]!.trim();

  let month = new Date().getMonth() + 1;
  let year = new Date().getFullYear();
  const monthYearMatch = line.match(/([A-Za-z]{3}),?\s*(\d{4})/i);
  if (monthYearMatch) {
    const monStr = monthYearMatch[1]!.toLowerCase().slice(0, 3);
    month = MONTH_NAMES[monStr] ?? month;
    year = parseInt(monthYearMatch[2]!, 10) || year;
  }

  return {
    lineNumber,
    base,
    crewType,
    scheduleCode,
    month,
    year,
  };
}
