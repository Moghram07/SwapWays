import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import { formatDisplayDate } from "@/utils/dateUtils";
import { formatCreditHours } from "@/utils/formatters";
import { getAirportCity } from "@/utils/airportNames";
import type { TradeWithUser } from "@/types/trade";

interface TradeCardProps {
  trade: TradeWithUser & { id: string; _count?: { matches: number }; matchCount?: number };
  showRequest?: boolean;
  onMessage?: (trade: TradeWithUser & { id: string }) => void;
}

export function TradeCard({ trade, showRequest = false, onMessage }: TradeCardProps) {
  const matchCount = trade.matchCount ?? (trade as { _count?: { matches: number } })._count?.matches ?? 0;
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{trade.tradeType === "FLIGHT_SWAP" ? "Flight" : "Vacation"}</Badge>
          <span className="font-medium">{getAirportCity(trade.destination)} ({trade.destination})</span>
          <span className="text-slate-500">{formatDisplayDate(new Date(trade.departureDate))}</span>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {trade.user.rank.name} · {trade.user.base.name} · Credit {formatCreditHours(trade.creditHours)} · TAFB {formatCreditHours(trade.tafb)}
        </p>
        {matchCount > 0 && <p className="mt-1 text-xs text-sky-600">{matchCount} match{matchCount !== 1 ? "es" : ""}</p>}
      </CardContent>
      {(showRequest || onMessage) && (
        <CardFooter className="flex flex-wrap gap-2">
          {onMessage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 border-[#1E6FB9] text-[#1E6FB9] hover:bg-[#E3EFF9]"
              onClick={() => onMessage(trade)}
            >
              <MessageCircle size={16} />
              Message
            </Button>
          )}
          {showRequest && (
            <Link href={`/dashboard/matches?trade=${trade.id}`}>
              <Button size="sm">Request swap</Button>
            </Link>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
