import { MatchCard } from "./MatchCard";

interface MatchRecord {
  id: string;
  matchScore: number;
  status: string;
  offererId: string;
  receiverId: string;
  trade: { destination: string | null; departureDate: Date | null };
  offerer?: { firstName: string; lastName: string; rank: { name: string } };
  receiver?: { firstName: string; lastName: string; rank: { name: string } };
}

interface MatchListProps {
  matches: MatchRecord[];
  currentUserId: string;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
}

export function MatchList({ matches, currentUserId, onAccept, onReject }: MatchListProps) {
  if (matches.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center text-sm text-slate-600">
        No matches yet.
      </p>
    );
  }
  return (
    <ul className="space-y-4">
      {matches.map((m) => {
        const isOfferer = m.offererId === currentUserId;
        const other = isOfferer ? m.receiver : m.offerer;
        const name = other ? `${other.firstName} ${other.lastName}` : "—";
        const rank = other?.rank?.name ?? "—";
        return (
          <li key={m.id}>
            <MatchCard
              id={m.id}
              matchScore={m.matchScore}
              status={m.status}
              tradeDestination={m.trade.destination}
              tradeDepartureDate={m.trade.departureDate ? new Date(m.trade.departureDate) : new Date()}
              otherPartyName={name}
              otherPartyRank={rank}
              onAccept={onAccept}
              onReject={onReject}
            />
          </li>
        );
      })}
    </ul>
  );
}
