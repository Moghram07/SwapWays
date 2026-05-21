import { getRequiredVisa } from "@/utils/visaRequirements";
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

type LineSwapUserLike = {
  rankId: string;
  rank: { code: string; category: string };
  hasUsVisa: boolean;
  hasChinaVisa: boolean;
};

type LineForVisa = {
  lineType: LineType;
  layovers: { destination: string }[];
};

function lineRequiresVisa(line: LineForVisa): { requiresUs: boolean; requiresChina: boolean } {
  let requiresUs = line.lineType === "US_LINE";
  let requiresChina = line.lineType === "CHINA_LINE";
  for (const layover of line.layovers) {
    const visa = getRequiredVisa(layover.destination);
    if (visa === "US") requiresUs = true;
    if (visa === "CHINA") requiresChina = true;
  }
  return { requiresUs, requiresChina };
}

export function checkLineSwapHardConstraints(
  viewer: LineSwapUserLike,
  poster: LineSwapUserLike,
  postLine: LineForVisa,
  viewerLine: LineForVisa | null
): { passes: boolean; failReason: string | null } {
  // Rank check — same rankId or compatible HST↔STW pair within cabin crew
  if (viewer.rankId !== poster.rankId) {
    if (viewer.rank.category !== poster.rank.category) {
      return { passes: false, failReason: "Incompatible rank (different crew category)" };
    }
    const compatiblePairs = new Set(["HST:STW", "STW:HST"]);
    if (!compatiblePairs.has(`${viewer.rank.code}:${poster.rank.code}`)) {
      return { passes: false, failReason: "Rank mismatch" };
    }
  }

  // Visa check: viewer must have visas required to fly the post's line
  const postVisas = lineRequiresVisa(postLine);
  if (postVisas.requiresUs && !viewer.hasUsVisa) {
    return { passes: false, failReason: "US visa required for this line" };
  }
  if (postVisas.requiresChina && !viewer.hasChinaVisa) {
    return { passes: false, failReason: "China visa required for this line" };
  }

  // Mutual visa check: poster must have visas required to fly the viewer's line
  if (viewerLine) {
    const viewerVisas = lineRequiresVisa(viewerLine);
    if (viewerVisas.requiresUs && !poster.hasUsVisa) {
      return { passes: false, failReason: "Poster lacks US visa required for your line" };
    }
    if (viewerVisas.requiresChina && !poster.hasChinaVisa) {
      return { passes: false, failReason: "Poster lacks China visa required for your line" };
    }
  }

  return { passes: true, failReason: null };
}

export function getLineTypeLabel(type: LineType): string {
  switch (type) {
    case "US_LINE":
      return "US Line";
    case "CHINA_LINE":
      return "China Line";
    case "RESERVE_LINE":
      return "Reserve Line";
    case "KULN":
      return "KULN";
    case "INDO":
      return "INDO";
    case "HJLN":
      return "HJLN";
    case "TRNG":
      return "TRNG";
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

  // Poster's wanted days off matched by viewer's days off (up to 25 pts)
  if (post.wantDaysOffStart != null && post.wantDaysOffEnd != null) {
    const overlapStart = Math.max(viewerLine.daysOffStart, post.wantDaysOffStart);
    const overlapEnd = Math.min(viewerLine.daysOffEnd, post.wantDaysOffEnd);
    if (overlapStart <= overlapEnd) {
      const overlapDays = overlapEnd - overlapStart + 1;
      const wantedDays = post.wantDaysOffEnd - post.wantDaysOffStart + 1;
      const ratio = overlapDays / wantedDays;
      score += Math.round(ratio * 25);
      reasons.push(`Days off overlap: ${overlapDays} day${overlapDays > 1 ? "s" : ""}`);
    }
  } else {
    score += 10;
    reasons.push("No days off preference");
  }

  // Viewer's wanted days off matched by post's days off (up to 20 pts)
  if (viewerLine.wantDaysOffStart != null && viewerLine.wantDaysOffEnd != null) {
    const overlapStart = Math.max(post.daysOffStart, viewerLine.wantDaysOffStart);
    const overlapEnd = Math.min(post.daysOffEnd, viewerLine.wantDaysOffEnd);
    if (overlapStart <= overlapEnd) {
      const overlapDays = overlapEnd - overlapStart + 1;
      const wantedDays = viewerLine.wantDaysOffEnd - viewerLine.wantDaysOffStart + 1;
      const ratio = overlapDays / wantedDays;
      score += Math.round(ratio * 20);
      reasons.push("Matches your preferred days off");
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
      score += 15;
      reasons.push(`Line type match: ${getLineTypeLabel(post.wantLineType)}`);
    }
  } else {
    score += 8;
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
    score += 7;
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reasons,
  };
}
