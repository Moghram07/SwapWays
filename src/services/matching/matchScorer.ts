// Soft scoring 0–100 for match quality.

type TradeForScoring = {
  destination: string;
  departureDate: Date;
  creditHours: number | null;
  layoverDuration: number | null;
  desiredDestinations: string[];
  wtfDays: number[];
  preferMinCredit: number | null;
  preferMaxCredit: number | null;
};

export function scoreSingleMatch(trade: TradeForScoring, candidate: TradeForScoring): number {
  let score = 0;
  score += scoreDestinationMatch(trade, candidate);
  score += scoreDateProximity(trade, candidate);
  score += scoreCreditHourBalance(trade, candidate);
  score += scoreWtfDayOverlap(trade, candidate);
  score += scoreLayoverPreference(trade, candidate);
  return Math.min(score, 100);
}

function scoreDestinationMatch(trade: TradeForScoring, candidate: TradeForScoring): number {
  const want = trade.desiredDestinations.map((d) => d.toUpperCase());
  const got = candidate.destination.toUpperCase();
  if (want.includes(got)) return 30;
  return 0;
}

function scoreDateProximity(trade: TradeForScoring, candidate: TradeForScoring): number {
  const diffDays = Math.abs(
    (trade.departureDate.getTime() - candidate.departureDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays <= 1) return 20;
  if (diffDays <= 3) return 15;
  if (diffDays <= 7) return 10;
  return 0;
}

function scoreCreditHourBalance(trade: TradeForScoring, candidate: TradeForScoring): number {
  const min = trade.preferMinCredit ?? 0;
  const max = trade.preferMaxCredit ?? 999;
  const cred = candidate.creditHours ?? 0;
  if (cred >= min && cred <= max) return 20;
  if (cred >= min * 0.9 && cred <= max * 1.1) return 10;
  return 0;
}

function scoreWtfDayOverlap(trade: TradeForScoring, candidate: TradeForScoring): number {
  const setB = new Set(candidate.wtfDays);
  const overlap = trade.wtfDays.filter((d) => setB.has(d)).length;
  if (overlap >= 5) return 15;
  if (overlap >= 1) return 8;
  return 0;
}

function scoreLayoverPreference(trade: TradeForScoring, candidate: TradeForScoring): number {
  const a = trade.layoverDuration ?? 0;
  const b = candidate.layoverDuration ?? 0;
  const ratio = a > 0 ? b / a : 1;
  if (ratio >= 0.8 && ratio <= 1.2) return 15;
  return 5;
}
