import { TradeCard } from "./TradeCard";
import type { TradeWithUser } from "@/types/trade";

interface TradeListProps {
  trades: (TradeWithUser & { id: string; _count?: { matches: number }; matchCount?: number })[];
  showRequestButton?: boolean;
  onMessage?: (trade: TradeWithUser & { id: string }) => void;
}

export function TradeList({ trades, showRequestButton = false, onMessage }: TradeListProps) {
  if (trades.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-12 text-center text-slate-600">
        No trades to show.
      </p>
    );
  }
  return (
    <ul className="space-y-4">
      {trades.map((trade) => (
        <li key={trade.id}>
          <TradeCard trade={trade} showRequest={showRequestButton} onMessage={onMessage} />
        </li>
      ))}
    </ul>
  );
}
