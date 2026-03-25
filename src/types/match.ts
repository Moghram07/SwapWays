import type { MatchStatus } from "./enums";

export interface MatchResult {
  tradeId: string;
  matchedTradeId: string;
  score: number;
  isValid: boolean;
  rejectionReasons: string[];
}

export interface MatchWithDetails {
  id: string;
  tradeId: string;
  offererId: string;
  receiverId: string;
  matchScore: number;
  status: MatchStatus;
  rejectionReason: string | null;
  createdAt: Date;
  offerer: { firstName: string; lastName: string; rank: { name: string }; base: { name: string } };
  receiver: { firstName: string; lastName: string; rank: { name: string }; base: { name: string } };
  trade: { destination: string; departureDate: Date; creditHours: number | null };
}
