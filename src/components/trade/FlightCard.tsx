import Link from "next/link";
import { Plane, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TradeWithUser } from "@/types/trade";

const PRIMARY = "#1E6FB9";
const ACCENT = "#2DAF66";

interface FlightCardProps {
  trade: TradeWithUser & { _count?: { matches: number }; matchCount?: number };
  showSwapButton?: boolean;
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(hours: number | null | undefined): string {
  if (hours == null || hours === 0) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function FlightCard({ trade, showSwapButton = true }: FlightCardProps) {
  const matchCount = trade.matchCount ?? (trade as { _count?: { matches: number } })._count?.matches ?? 0;
  const origin = trade.user?.base?.airportCode ?? "—";
  const route = `${origin} → ${trade.destination}`;
  const flightLabel = trade.flightNumber ?? trade.id.slice(-4).toUpperCase();
  const aircraft = trade.aircraftTypeCode ?? "—";
  const departureTime = trade.departureTime ?? trade.reportTime ?? "—";
  const duration = formatDuration(trade.flyingTime ?? undefined);
  const hasPendingMatch = matchCount > 0 && trade.status === "OPEN";
  const statusLabel = hasPendingMatch ? "Swap Pending" : trade.status === "OPEN" ? "Swappable" : "Confirmed";

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${PRIMARY}14` }}
      >
        <Plane className="h-5 w-5" style={{ color: PRIMARY }} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">{route}</p>
        <p className="text-xs text-slate-500">
          {flightLabel} · {aircraft}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-6">
        <div>
          <p className="text-xs text-slate-500">Date</p>
          <p className="font-medium text-slate-900">{formatDate(new Date(trade.departureDate))}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Departure</p>
          <p className="font-medium text-slate-900">{departureTime}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Duration</p>
          <p className="font-medium text-slate-900">{duration}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            hasPendingMatch ? "text-white" : trade.status === "OPEN" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
          }`}
          style={hasPendingMatch ? { backgroundColor: ACCENT } : undefined}
        >
          {statusLabel}
        </span>
        {showSwapButton && trade.tradeType === "FLIGHT_SWAP" && trade.status === "OPEN" && (
          <Link href={`/dashboard/browse?trade=${trade.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeftRight className="h-3.5 w-3.5" strokeWidth={2} />
              Swap
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
