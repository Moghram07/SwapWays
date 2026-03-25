import type { SwapStatus } from "@/types/tripCard";
import type { TradeStatus } from "@/types/enums";

export interface SwapStatusInfo {
  status: SwapStatus;
  tradeId?: string;
}

function tradeStatusToSwapStatus(status: TradeStatus): SwapStatus {
  switch (status) {
    case "OPEN":
      return "posted";
    case "MATCHED":
      return "matched";
    case "ACCEPTED":
      return "accepted";
    case "COMPLETED":
      return "completed";
    default:
      return "none";
  }
}

export function getSwapStatusByScheduleTripId(trades: {
  id: string;
  status: TradeStatus;
  scheduleTripId: string | null;
}[]): Record<string, SwapStatusInfo> {
  const map: Record<string, SwapStatusInfo> = {};
  for (const trade of trades) {
    if (!trade.scheduleTripId) continue;
    const status = tradeStatusToSwapStatus(trade.status);
    map[trade.scheduleTripId] = { status, tradeId: trade.id };
  }
  return map;
}

