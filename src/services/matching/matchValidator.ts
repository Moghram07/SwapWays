// Hard constraint checks — pass/fail only.

type TradeForValidation = {
  destination: string;
  aircraftTypeCode: string | null;
  user: { baseId: string; rankId: string; qualifications: { aircraftType: { code: string } }[] };
};

type ValidationResult = { isValid: boolean; rejectionReasons: string[] };

export function filterByHardConstraints(
  tradeA: TradeForValidation,
  candidates: TradeForValidation[]
): { candidate: TradeForValidation; rejectionReasons: string[] }[] {
  return candidates.map((candidate) => {
    const result = validateCandidate(tradeA, candidate);
    return { candidate, rejectionReasons: result.rejectionReasons };
  });
}

export function validateCandidate(tradeA: TradeForValidation, tradeB: TradeForValidation): ValidationResult {
  const reasons: string[] = [];
  if (!isSameBase(tradeA, tradeB)) reasons.push("BASE_MISMATCH");
  if (!isSameRank(tradeA, tradeB)) reasons.push("RANK_MISMATCH");
  if (!isQualifiedForAircraft(tradeB.user, tradeA.aircraftTypeCode)) reasons.push("QUALIFICATION_MISMATCH");
  if (!isQualifiedForAircraft(tradeA.user, tradeB.aircraftTypeCode)) reasons.push("QUALIFICATION_MISMATCH");
  return { isValid: reasons.length === 0, rejectionReasons: reasons };
}

export function isSameBase(tradeA: TradeForValidation, tradeB: TradeForValidation): boolean {
  return tradeA.user.baseId === tradeB.user.baseId;
}

export function isSameRank(tradeA: TradeForValidation, tradeB: TradeForValidation): boolean {
  return tradeA.user.rankId === tradeB.user.rankId;
}

export function isQualifiedForAircraft(
  user: { qualifications: { aircraftType: { code: string } }[] },
  aircraftCode: string | null
): boolean {
  if (!aircraftCode) return true;
  const normalize = (code: string) => {
    const c = code.toUpperCase();
    if (c.startsWith("77") || c.startsWith("B777")) return "B777";
    if (c.startsWith("78") || c.startsWith("B787")) return "B787";
    if (c.startsWith("33") || c.startsWith("A330")) return "A330";
    if (c === "323" || c.startsWith("A321")) return "A321";
    if (c.startsWith("32") || c.startsWith("A320")) return "A320";
    return c;
  };
  const normalizedTarget = normalize(aircraftCode);
  const normalizedQualifications = user.qualifications.map((q) => normalize(q.aircraftType.code));
  return normalizedQualifications.includes(normalizedTarget);
}
