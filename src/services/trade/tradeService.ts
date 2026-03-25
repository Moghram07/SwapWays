import * as tradeRepo from "@/repositories/tradeRepository";
import { findMatchesForTrade } from "@/services/matching/matchEngine";
import type { CreateTradeInput } from "@/types/trade";
import type { MatchResult } from "@/types/match";

export async function createTradeAndMatch(userId: string, data: CreateTradeInput): Promise<{
  trade: Awaited<ReturnType<typeof tradeRepo.createTrade>>;
  matches: MatchResult[];
}> {
  const trade = await tradeRepo.createTrade(userId, data);
  const matches = await findMatchesForTrade(trade.id);
  return { trade, matches };
}
