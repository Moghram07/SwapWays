"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Inbox, Pencil } from "lucide-react";
import { SwapPostTradeBoardCard } from "@/components/swap-post/TradeBoardCard";
import { TradeBoardSection } from "@/components/swap-post/TradeBoardSection";
import { getAirportCity } from "@/utils/airportNames";

type SwapsTab = "mySwaps" | "tradeBoard" | "lineSwap";

const TAB_LABELS: { id: SwapsTab; label: string }[] = [
  { id: "mySwaps", label: "My Swaps" },
  { id: "tradeBoard", label: "Trade Board" },
  { id: "lineSwap", label: "Line Swap" },
];

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

interface VacationTrade {
  id: string;
  status: string;
  vacationStartDate: Date | null;
  vacationEndDate: Date | null;
  desiredDestinations: string[] | null;
  desiredVacationMonths?: number[];
  createdAt: string;
  user?: { firstName: string; lastName?: string; rank?: { name: string }; base?: { name: string } };
}

interface SwapPostRecord {
  id: string;
  status: string;
  postType: string;
  offeredTrips: {
    flightNumber: string;
    destination: string;
    departureDate: string;
    tripType: string;
    creditHours: number;
    hasLayover: boolean;
    layoverHours?: number | null;
  }[];
  offeringDaysOff?: boolean;
  offeredDaysOff?: number[];
  wantType: string;
  wantMinLayover?: number | null;
  wantEqualHours?: boolean;
  wantSameDate?: boolean;
  wantDestinations?: string[];
  wantExclude?: string[];
  wtfDays?: number[];
  wantDaysOff?: boolean;
  notes?: string | null;
  user: { firstName: string; rank: { name: string }; base: { name: string } };
  createdAt?: string;
  vacationYear?: number | null;
  vacationMonth?: number | null;
  vacationStartDay?: number | null;
  vacationEndDay?: number | null;
  desiredVacationMonths?: number[];
  vacationStartDate?: string | null;
  vacationEndDate?: string | null;
  desiredVacationStart?: string | null;
  desiredVacationEnd?: string | null;
}

interface MatchesClientProps {
  initialMatches: MatchRecord[];
  currentUserId: string;
}

type SwapStatusPill = "active" | "pending" | "completed";

/** Pending = both parties accepted, waiting for airline. Completed = airline accepted (or expired). */
function getStatusPill(status: string): SwapStatusPill {
  if (status === "AGREED" || status === "ACCEPTED") return "pending";
  if (status === "COMPLETED" || status === "EXPIRED") return "completed";
  return "active";
}

function postToCard(p: SwapPostRecord) {
  return {
    postType: p.postType,
    offeredTrips: p.offeredTrips.map((t) => {
      const tripType = t.tripType as "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
      const legs = (t as { scheduleTrip?: { legs: { arrivalAirport: string; departureAirport: string }[] } }).scheduleTrip?.legs ?? [];
      let stopsDisplay: string | undefined;
      if (tripType === "MULTI_STOP" && legs.length > 0) {
        const firstLeg = legs[0];
        const base = firstLeg?.departureAirport;
        const codes = legs.map((l) => l.arrivalAirport);
        if (base && codes.length > 0 && codes[codes.length - 1] === base) codes.pop();
        if (codes.length > 0) {
          stopsDisplay = codes.map((c) => getAirportCity(c)).join(" → ");
        }
      }
      return {
        flightNumber: t.flightNumber,
        destination: t.destination,
        departureDate: new Date(t.departureDate),
        tripType,
        creditHours: t.creditHours,
        hasLayover: t.hasLayover,
        layoverHours: t.layoverHours,
        stopsDisplay,
      };
    }),
    offeringDaysOff: p.offeringDaysOff,
    offeredDaysOff: p.offeredDaysOff ?? [],
    wantType: p.wantType,
    wantMinLayover: p.wantMinLayover,
    wantEqualHours: p.wantEqualHours,
    wantSameDate: p.wantSameDate,
    wantDestinations: p.wantDestinations,
    wantExclude: p.wantExclude,
    wtfDays: p.wtfDays,
    wantDaysOff: p.wantDaysOff,
    notes: p.notes,
    user: p.user,
    createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
    vacationYear: p.vacationYear ?? undefined,
    vacationMonth: p.vacationMonth ?? undefined,
    vacationStartDay: p.vacationStartDay ?? undefined,
    vacationEndDay: p.vacationEndDay ?? undefined,
    desiredVacationMonths: p.desiredVacationMonths ?? [],
    vacationStartDate: p.vacationStartDate ? new Date(p.vacationStartDate) : undefined,
    vacationEndDate: p.vacationEndDate ? new Date(p.vacationEndDate) : undefined,
    desiredVacationStart: p.desiredVacationStart ? new Date(p.desiredVacationStart) : undefined,
    desiredVacationEnd: p.desiredVacationEnd ? new Date(p.desiredVacationEnd) : undefined,
  };
}

function vacationTradeToPost(t: VacationTrade) {
  const start = t.vacationStartDate ? new Date(t.vacationStartDate) : undefined;
  const end = t.vacationEndDate ? new Date(t.vacationEndDate) : undefined;
  const user = t.user ?? { firstName: "Crew", rank: { name: "Crew" }, base: { name: "Base" } };
  return {
    postType: "VACATION_SWAP" as const,
    offeredTrips: [],
    offeringDaysOff: false,
    offeredDaysOff: [] as number[],
    wantType: "ANYTHING" as const,
    wantMinLayover: null as number | null,
    wantEqualHours: false,
    wantSameDate: false,
    wantDestinations: t.desiredDestinations ?? undefined,
    wantExclude: undefined as string[] | undefined,
    wtfDays: undefined as number[] | undefined,
    wantDaysOff: false,
    notes: null as string | null,
    user: {
      firstName: user.firstName ?? "Crew",
      rank: { name: user.rank?.name ?? "Crew" },
      base: { name: user.base?.name ?? "Base" },
    },
    createdAt: t.createdAt ? new Date(t.createdAt) : undefined,
    vacationStartDate: start,
    vacationEndDate: end,
    desiredVacationStart: undefined,
    desiredVacationEnd: undefined,
    vacationYear: start?.getFullYear() ?? undefined,
    vacationMonth: start ? start.getMonth() + 1 : undefined,
    vacationStartDay: start?.getDate(),
    vacationEndDay: end?.getDate(),
    desiredVacationMonths: t.desiredVacationMonths ?? [],
  };
}

export function MatchesClient({ initialMatches, currentUserId }: MatchesClientProps) {
  const [activeTab, setActiveTab] = useState<SwapsTab>("mySwaps");
  const [matches] = useState(initialMatches);
  const [vacationTrades, setVacationTrades] = useState<VacationTrade[]>([]);
  const [mySwapPosts, setMySwapPosts] = useState<SwapPostRecord[]>([]);

  const fetchSwapPosts = () => {
    fetch("/api/swap-posts?mine=1")
      .then((r) => r.json())
      .then((json) => {
        setMySwapPosts(Array.isArray(json.data) ? json.data : []);
      })
      .catch(() => setMySwapPosts([]));
  };

  useEffect(() => {
    fetch("/api/trades?mine=1")
      .then((r) => r.json())
      .then((json) => {
        const items = json.data?.items ?? [];
        setVacationTrades(
          items.filter((t: { tradeType: string }) => t.tradeType === "VACATION_SWAP")
        );
      })
      .catch(() => setVacationTrades([]));
  }, []);

  useEffect(() => {
    fetchSwapPosts();
  }, []);

  const handleCancel = async (item: { id: string; source: "swapPost" | "vacation"; statusPill: SwapStatusPill }) => {
    if (item.statusPill !== "active") return;
    if (!confirm("Cancel this swap? It will be removed from the trade board.")) return;

    const url = item.source === "swapPost"
      ? `/api/swap-posts/${item.id}/cancel`
      : `/api/trades/${item.id}/cancel`;
    const res = await fetch(url, { method: "PATCH" });
    if (!res.ok) return;

    if (item.source === "swapPost") {
      fetchSwapPosts();
    } else {
      fetch("/api/trades?mine=1")
        .then((r) => r.json())
        .then((json) => {
          const items = json.data?.items ?? [];
          setVacationTrades(
            items.filter((t: { tradeType: string }) => t.tradeType === "VACATION_SWAP")
          );
        })
        .catch(() => setVacationTrades([]));
    }
  };

  const mySwaps = useMemo(() => {
    const items: { id: string; source: "swapPost" | "vacation"; createdAt: Date; post: ReturnType<typeof postToCard>; statusPill: SwapStatusPill }[] = [];
    for (const p of mySwapPosts) {
      const status = (p as SwapPostRecord).status ?? "OPEN";
      if (status === "CANCELLED") continue;
      items.push({
        id: (p as SwapPostRecord).id,
        source: "swapPost",
        createdAt: (p as SwapPostRecord).createdAt ? new Date((p as SwapPostRecord).createdAt!) : new Date(0),
        post: postToCard(p as SwapPostRecord),
        statusPill: getStatusPill(status),
      });
    }
    for (const t of vacationTrades) {
      if (t.status === "CANCELLED") continue;
      items.push({
        id: t.id,
        source: "vacation",
        createdAt: t.createdAt ? new Date(t.createdAt) : new Date(0),
        post: vacationTradeToPost(t),
        statusPill: getStatusPill(t.status),
      });
    }
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return items;
  }, [mySwapPosts, vacationTrades]);

  const emptyMessage =
    "You haven't posted any swaps yet. Go to My Flights to offer trips, or browse the Trade Board.";
  const emptyState = (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-12 px-4 shadow-sm">
      <div className="flex flex-col items-center justify-center gap-5 text-center max-w-sm mx-auto">
        <Inbox className="h-12 w-12 text-slate-400" aria-hidden />
        <p className="text-slate-600 text-sm leading-relaxed">{emptyMessage}</p>
        <Link href="/dashboard/add-trade">
          <Button
            className="gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ backgroundColor: "var(--primary-cta)" }}
          >
            <Plus className="h-4 w-4" />
            Post to Trade Board
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div
        className="inline-flex rounded-lg border border-slate-200 bg-slate-50/80 p-1"
        role="tablist"
        aria-label="Swaps sections"
      >
        {TAB_LABELS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1 ${
              activeTab === id
                ? "bg-white text-[var(--primary-cta)] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "mySwaps" && (
        <div className="space-y-4">
          {mySwaps.length === 0 ? (
            emptyState
          ) : (
            <ul className="space-y-4">
              {mySwaps.map((item) => (
                <li key={`${item.source}-${item.id}`}>
                  <div
                    className={`rounded-xl border bg-white shadow-sm overflow-hidden ${
                      item.statusPill === "active"
                        ? "border-l-4 border-l-[var(--primary)] border-slate-200"
                        : item.statusPill === "pending"
                          ? "border-l-4 border-l-amber-500 border-slate-200"
                          : "border-l-4 border-l-[var(--accent)] border-slate-200"
                    }`}
                  >
                    <SwapPostTradeBoardCard
                      post={item.post as Parameters<typeof SwapPostTradeBoardCard>[0]["post"]}
                      isPreview
                      statusPill={item.statusPill}
                    />
                    {item.statusPill === "active" && (
                      <div className="border-t border-slate-100 px-4 py-2.5 flex justify-end gap-3 bg-slate-50/50">
                        {item.source === "swapPost" && (
                          <Link
                            href={`/dashboard/add-trade?edit=${item.id}`}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1 rounded"
                          >
                            <Pencil size={14} />
                            Edit
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCancel(item)}
                          className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 rounded"
                        >
                          Cancel swap
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === "tradeBoard" && <TradeBoardSection />}

      {activeTab === "lineSwap" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Line Swap</h3>
          <p className="mt-2 text-sm text-slate-600">
            Trade complete monthly lines with other crew members.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link href="/dashboard/line-swap">
              <Button
                className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: "var(--primary-cta)" }}
              >
                Open Line Swap Board
              </Button>
            </Link>
            <Link href="/dashboard/add-trade?type=line-swap">
              <Button
                variant="outline"
                className="rounded-lg px-4 py-2 text-sm font-medium"
              >
                Post a Line Swap
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
