"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface Person {
  id: string;
  firstName: string;
  rank?: { name: string };
  base?: { name: string };
}

export interface ConversationForHeader {
  initiatorId: string;
  tradeOwnerId?: string | null;
  postOwnerId?: string | null;
  status: string;
  initiator: Person;
  tradeOwner?: Person | null;
  postOwner?: Person | null;
  trade?: {
    scheduleTrip?: {
      id: string;
      tripNumber: string;
      startDate: Date | string;
      legs: { flightNumber: string; departureAirport: string; arrivalAirport: string }[];
      layovers?: unknown[];
    } | null;
  } | null;
  swapPost?: { offeredTrips: unknown[] } | null;
  offeredTrip?: {
    id: string;
    tripNumber: string;
    startDate: Date | string;
    legs: { flightNumber: string; departureAirport: string; arrivalAirport: string }[];
    layovers?: unknown[];
  } | null;
  offeredTrips?: { scheduleTrip?: { id: string; tripNumber: string; startDate: Date | string; legs: unknown[] } }[];
}

function ConversationStatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    ACTIVE: "Active",
    SWAP_PROPOSED: "Swap proposed",
    SWAP_ACCEPTED: "Accepted",
    DECLINED: "Declined",
    EXPIRED: "Expired",
  };
  const colors: Record<string, string> = {
    ACTIVE: "bg-slate-100 text-slate-600",
    SWAP_PROPOSED: "bg-amber-50 text-amber-700",
    SWAP_ACCEPTED: "bg-[#E8F5EA] text-[#3BA34A]",
    DECLINED: "bg-red-50 text-red-600",
    EXPIRED: "bg-slate-100 text-slate-400",
  };
  return (
    <span
      className={`text-xs px-2 py-1 rounded-full ${colors[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function ChatHeader({
  conversation,
  currentUserId,
}: {
  conversation: ConversationForHeader;
  currentUserId: string;
}) {
  const isInitiator = conversation.initiatorId === currentUserId;
  const otherPerson = isInitiator ? (conversation.tradeOwner ?? conversation.postOwner) : conversation.initiator;
  const displayName = otherPerson?.firstName ?? "Crew";

  return (
    <div className="border-b border-slate-200 bg-white shrink-0">
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard/messages"
            className="md:hidden shrink-0 p-1 -ml-1 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            aria-label="Back to conversations"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-[var(--primary)]">
              {displayName[0] ?? "?"}
            </span>
          </div>
          <div>
            <p className="font-medium text-slate-900">{displayName}</p>
            <p className="text-xs text-slate-500">
              {otherPerson?.rank?.name ?? ""} · {otherPerson?.base?.name ?? ""} Base
            </p>
          </div>
        </div>
        <ConversationStatusBadge status={conversation.status} />
      </div>
    </div>
  );
}
