import type { LineType } from "@/types/enums";

type LineSwapLike = {
  lineType: LineType;
  daysOffStart: number;
  daysOffEnd: number;
  hasReserve: boolean;
  layovers: { destination: string }[];
  wantLineType: LineType | null;
  wantDaysOffStart: number | null;
  wantDaysOffEnd: number | null;
  wantDestination: string | null;
  wantNoReserve: boolean;
};

export function getLineTypeLabel(type: LineType): string {
  switch (type) {
    case "US_LINE":
      return "US Line";
    case "CHINA_LINE":
      return "China Line";
    case "RESERVE_LINE":
      return "Reserve Line";
    default:
      return "Normal Line";
  }
}

export function scoreLineSwapMatch(
  viewerLine: LineSwapLike | null,
  post: LineSwapLike
): { score: number; reasons: string[] } {
  if (!viewerLine) return { score: 0, reasons: ["Post your line to see match %"] };

  let score = 0;
  const reasons: string[] = [];

  if (post.wantDaysOffStart != null && post.wantDaysOffEnd != null) {
    const overlapStart = Math.max(viewerLine.daysOffStart, post.wantDaysOffStart);
    const overlapEnd = Math.min(viewerLine.daysOffEnd, post.wantDaysOffEnd);
    if (overlapStart <= overlapEnd) {
      const overlapDays = overlapEnd - overlapStart + 1;
      const wantedDays = post.wantDaysOffEnd - post.wantDaysOffStart + 1;
      const ratio = overlapDays / wantedDays;
      score += Math.round(ratio * 35);
      reasons.push(`Days off overlap: ${overlapDays} day${overlapDays > 1 ? "s" : ""}`);
    }
  } else {
    score += 15;
    reasons.push("No days off preference");
  }

  if (viewerLine.wantDaysOffStart != null && viewerLine.wantDaysOffEnd != null) {
    const overlapStart = Math.max(post.daysOffStart, viewerLine.wantDaysOffStart);
    const overlapEnd = Math.min(post.daysOffEnd, viewerLine.wantDaysOffEnd);
    if (overlapStart <= overlapEnd) {
      score += 5;
      reasons.push("Mutual days-off benefit");
    }
  }

  if (post.wantDestination) {
    const viewerDestinations = new Set(viewerLine.layovers.map((l) => l.destination.toUpperCase()));
    if (viewerDestinations.has(post.wantDestination.toUpperCase())) {
      score += 25;
      reasons.push(`Has ${post.wantDestination.toUpperCase()} layover`);
    }
  } else {
    score += 10;
    reasons.push("No destination preference");
  }

  if (post.wantLineType) {
    if (viewerLine.lineType === post.wantLineType) {
      score += 20;
      reasons.push(`Line type match: ${getLineTypeLabel(post.wantLineType)}`);
    }
  } else {
    score += 10;
    reasons.push("No line type preference");
  }

  if (post.wantNoReserve) {
    if (!viewerLine.hasReserve) {
      score += 15;
      reasons.push("No reserve days");
    } else {
      reasons.push("Viewer line has reserve days");
    }
  } else {
    score += 8;
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reasons,
  };
}
