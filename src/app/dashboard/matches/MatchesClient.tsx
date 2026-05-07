"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Inbox, Pencil } from "lucide-react";
import { SwapPostTradeBoardCard } from "@/components/swap-post/TradeBoardCard";
import { TradeBoardSection } from "@/components/swap-post/TradeBoardSection";
import { getAirportCity } from "@/utils/airportNames";
import { isSwapPostExpired, isTradeExpired } from "@/lib/swapExpiry";
import { swapPostHasDisplayableOffer } from "@/lib/swapPostDisplay";
import { parseWantAcceptanceOptions } from "@/lib/wantAcceptanceOptions";

type SwapsTab = "mySwaps" | "tradeBoard" | "lineSwap" | "vacationSwap";

type MySwapsSubTab = "active" | "history";

const TAB_LABELS: { id: SwapsTab; label: string }[] = [
  { id: "mySwaps", label: "My Swaps" },
  { id: "tradeBoard", label: "Swaps" },
  { id: "lineSwap", label: "Line Swap" },
  { id: "vacationSwap", label: "Vacation Swap" },
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
    flightNumber: string | null;
    destination: string;
    destinations?: string[];
    departureDate: string;
    tripType: string;
    creditHours: number | null;
    blockHours?: number | null;
    tafb?: number | null;
    hasLayover: boolean;
    layoverHours?: number | null;
    reportTime?: string | null;
    scheduleTrip?: {
      reportTime?: string;
      legs?: {
        legOrder: number;
        flightNumber?: string;
        departureTime?: string;
        departureDate?: string;
        departureAirport?: string;
        arrivalTime?: string;
        arrivalDate?: string;
        arrivalAirport?: string;
        flyingTime?: number;
      }[];
    };
  }[];
  offeringDaysOff?: boolean;
  offeredDaysOff?: number[];
  wantType: string;
  wantMinLayover?: number | null;
  wantEqualHours?: boolean;
  wantSameDate?: boolean;
  wantDestinations?: string[];
  wantExclude?: string[];
  wantAcceptanceOptions?: unknown;
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
  inputSource?: "MANUAL_QUICK" | "SCHEDULE_PREFILL" | null;
  quickTripType?: "LAYOVER" | "TURNAROUND" | "MULTI_STOP" | null;
  quickDestinations?: string[];
  quickDate?: string | null;
  quickLayoverHours?: number | null;
  advancedReportTime?: string | null;
  advancedAircraftTypeCode?: string | null;
  advancedBlockHours?: number | null;
  advancedFlightNumber?: string | null;
  expiresAt?: string | null;
}

interface MatchesClientProps {
  initialMatches: MatchRecord[];
  currentUserId: string;
}

type SwapStatusPill = "active" | "pending" | "completed" | "expired" | "cancelled";

/** Map API status to card pill (EXPIRED → Expired label, not Completed). */
function getStatusPill(status: string): SwapStatusPill {
  if (status === "EXPIRED") return "expired";
  if (status === "CANCELLED") return "cancelled";
  if (status === "AGREED" || status === "ACCEPTED" || status === "MATCHED") return "pending";
  if (status === "COMPLETED") return "completed";
  return "active";
}

function vacationTradeHasDisplayableDates(t: VacationTrade): boolean {
  return Boolean(t.vacationStartDate || t.vacationEndDate);
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
        flightNumber: t.flightNumber ?? "",
        destination: t.destination,
        destinations: t.destinations ?? [],
        departureDate: new Date(t.departureDate),
        tripType,
        creditHours: t.creditHours,
        blockHours: t.blockHours ?? t.creditHours,
        tafb: t.tafb,
        hasLayover: t.hasLayover,
        layoverHours: t.layoverHours,
        reportTime: t.reportTime ?? t.scheduleTrip?.reportTime,
        legs: (t.scheduleTrip?.legs ?? [])
          .slice()
          .sort((a, b) => (a.legOrder ?? 0) - (b.legOrder ?? 0))
          .map((l) => ({
            legOrder: l.legOrder,
            flightNumber: l.flightNumber,
            departureTime: l.departureTime,
            departureDate: l.departureDate ? new Date(l.departureDate) : undefined,
            departureAirport: l.departureAirport,
            arrivalTime: l.arrivalTime,
            arrivalDate: l.arrivalDate ? new Date(l.arrivalDate) : undefined,
            arrivalAirport: l.arrivalAirport,
            flyingTime: l.flyingTime,
          })),
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
    wantAcceptanceOptions: parseWantAcceptanceOptions(p.wantAcceptanceOptions),
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
    source: p.inputSource ?? undefined,
    quickTripType: p.quickTripType ?? undefined,
    quickDestinations: p.quickDestinations ?? [],
    quickDate: p.quickDate ? new Date(p.quickDate) : undefined,
    quickLayoverHours: p.quickLayoverHours ?? undefined,
    advancedReportTime: p.advancedReportTime ?? undefined,
    advancedAircraftTypeCode: p.advancedAircraftTypeCode ?? undefined,
    advancedBlockHours: p.advancedBlockHours ?? undefined,
    advancedFlightNumber: p.advancedFlightNumber ?? undefined,
  };
}

function swapPostRecordToExpiryLike(p: SwapPostRecord) {
  return {
    postType: p.postType,
    expiresAt: p.expiresAt ?? undefined,
    vacationYear: p.vacationYear ?? undefined,
    vacationMonth: p.vacationMonth ?? undefined,
    vacationStartDate: p.vacationStartDate ?? undefined,
    vacationEndDate: p.vacationEndDate ?? undefined,
    quickDate: p.quickDate ?? undefined,
    createdAt: p.createdAt ?? undefined,
    offeredTrips: (p.offeredTrips ?? []).map((t) => ({
      departureDate: t.departureDate,
      scheduleTrip: { reportTime: t.scheduleTrip?.reportTime ?? t.reportTime ?? null },
    })),
  };
}

function vacationTradeToPost(t: VacationTrade) {
  const start = t.vacationStartDate ? new Date(t.vacationStartDate) : undefined;
  const end = t.vacationEndDate ? new Date(t.vacationEndDate) : undefined;
  const user = t.user ?? { firstName: "Crew", rank: { name: "Crew" }, base: { name: "Base" } };
  return {
    postType: "VACATION_SWAP" as const,
    source: undefined,
    quickTripType: undefined,
    quickDestinations: [] as string[],
    quickDate: undefined,
    quickLayoverHours: undefined,
    advancedReportTime: undefined,
    advancedAircraftTypeCode: undefined,
    advancedBlockHours: undefined,
    advancedFlightNumber: undefined,
    offeredTrips: [],
    offeringDaysOff: false,
    offeredDaysOff: [] as number[],
    wantType: "ANYTHING" as const,
    wantMinLayover: null as number | null,
    wantEqualHours: false,
    wantSameDate: false,
    wantDestinations: t.desiredDestinations ?? undefined,
    wantExclude: undefined as string[] | undefined,
    wantAcceptanceOptions: [],
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

type MySwapRow = {
  id: string;
  source: "swapPost" | "vacation";
  createdAt: Date;
  post: ReturnType<typeof postToCard>;
  statusPill: SwapStatusPill;
  recordStatus: string;
};

export function MatchesClient({ initialMatches }: MatchesClientProps) {
  const [activeTab, setActiveTab] = useState<SwapsTab>("mySwaps");
  const [mySwapsSubTab, setMySwapsSubTab] = useState<MySwapsSubTab>("active");
  void initialMatches;
  const [vacationTradesActive, setVacationTradesActive] = useState<VacationTrade[]>([]);
  const [vacationTradesHistory, setVacationTradesHistory] = useState<VacationTrade[]>([]);
  const [mySwapPostsActive, setMySwapPostsActive] = useState<SwapPostRecord[]>([]);
  const [mySwapPostsHistory, setMySwapPostsHistory] = useState<SwapPostRecord[]>([]);

  const loadMineData = async (signal?: AbortSignal) => {
    const [activePostsRes, historyPostsRes, activeTradesRes, historyTradesRes] = await Promise.all([
      fetch("/api/swap-posts?mine=1&scope=active", { credentials: "include", signal }).then((r) =>
        r.json().catch(() => ({}))
      ),
      fetch("/api/swap-posts?mine=1&scope=history", { credentials: "include", signal }).then((r) =>
        r.json().catch(() => ({}))
      ),
      fetch("/api/trades?mine=1&compact=1&excludeCancelled=1&tradeType=VACATION_SWAP&scope=active", {
        credentials: "include",
        signal,
      }).then((r) => r.json().catch(() => ({}))),
      fetch("/api/trades?mine=1&compact=1&tradeType=VACATION_SWAP&scope=history", {
        credentials: "include",
        signal,
      }).then((r) => r.json().catch(() => ({}))),
    ]);
    setMySwapPostsActive(Array.isArray(activePostsRes?.data) ? activePostsRes.data : []);
    setMySwapPostsHistory(Array.isArray(historyPostsRes?.data) ? historyPostsRes.data : []);
    const activeItems = activeTradesRes?.data?.items ?? [];
    const historyItems = historyTradesRes?.data?.items ?? [];
    setVacationTradesActive(activeItems.filter((t: { tradeType: string }) => t.tradeType === "VACATION_SWAP"));
    setVacationTradesHistory(historyItems.filter((t: { tradeType: string }) => t.tradeType === "VACATION_SWAP"));
  };

  useEffect(() => {
    const controller = new AbortController();
    loadMineData(controller.signal).catch(() => {
      setMySwapPostsActive([]);
      setMySwapPostsHistory([]);
      setVacationTradesActive([]);
      setVacationTradesHistory([]);
    });
    return () => controller.abort();
  }, []);

  const handleCancel = async (item: { id: string; source: "swapPost" | "vacation"; statusPill: SwapStatusPill; recordStatus: string }) => {
    if (item.recordStatus !== "OPEN" || item.statusPill !== "active") return;
    if (!confirm("Cancel this swap? It will be removed from the trade board.")) return;

    const url = item.source === "swapPost"
      ? `/api/swap-posts/${item.id}/cancel`
      : `/api/trades/${item.id}/cancel`;
    const res = await fetch(url, { method: "PATCH" });
    if (!res.ok) return;
    await loadMineData();
  };

  const mySwapsActiveRows = useMemo(() => {
    const now = new Date();
    const items: MySwapRow[] = [];
    for (const p of mySwapPostsActive) {
      const status = (p as SwapPostRecord).status ?? "OPEN";
      if (status !== "OPEN") continue;
      if (isSwapPostExpired(swapPostRecordToExpiryLike(p as SwapPostRecord), now)) continue;
      const post = postToCard(p as SwapPostRecord);
      items.push({
        id: (p as SwapPostRecord).id,
        source: "swapPost",
        createdAt: (p as SwapPostRecord).createdAt ? new Date((p as SwapPostRecord).createdAt!) : new Date(0),
        post,
        statusPill: getStatusPill(status),
        recordStatus: status,
      });
    }
    for (const t of vacationTradesActive) {
      if (t.status === "CANCELLED" || t.status === "EXPIRED" || t.status === "COMPLETED") continue;
      if (
        isTradeExpired(
          {
            tradeType: "VACATION_SWAP",
            departureDate: null,
            vacationStartDate: t.vacationStartDate,
            vacationEndDate: t.vacationEndDate,
          },
          now
        )
      ) {
        continue;
      }
      const post = vacationTradeToPost(t);
      items.push({
        id: t.id,
        source: "vacation",
        createdAt: t.createdAt ? new Date(t.createdAt) : new Date(0),
        post,
        statusPill: getStatusPill(t.status),
        recordStatus: t.status,
      });
    }
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return items;
  }, [mySwapPostsActive, vacationTradesActive]);

  const mySwapsHistoryRows = useMemo(() => {
    const items: MySwapRow[] = [];
    for (const p of mySwapPostsHistory) {
      if (!swapPostHasDisplayableOffer(p as SwapPostRecord)) continue;
      const status = (p as SwapPostRecord).status ?? "OPEN";
      const post = postToCard(p as SwapPostRecord);
      items.push({
        id: (p as SwapPostRecord).id,
        source: "swapPost",
        createdAt: (p as SwapPostRecord).createdAt ? new Date((p as SwapPostRecord).createdAt!) : new Date(0),
        post,
        statusPill: getStatusPill(status),
        recordStatus: status,
      });
    }
    for (const t of vacationTradesHistory) {
      if (!vacationTradeHasDisplayableDates(t)) continue;
      const post = vacationTradeToPost(t);
      items.push({
        id: t.id,
        source: "vacation",
        createdAt: t.createdAt ? new Date(t.createdAt) : new Date(0),
        post,
        statusPill: getStatusPill(t.status),
        recordStatus: t.status,
      });
    }
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return items;
  }, [mySwapPostsHistory, vacationTradesHistory]);

  const displayedMySwaps = mySwapsSubTab === "active" ? mySwapsActiveRows : mySwapsHistoryRows;

  const activeEmptyMessage =
    "You haven't posted any swaps yet. Go to My Flights to offer trips, or browse Swaps.";
  const historyEmptyMessage = "No past swaps yet. Cancelled, completed, and expired listings appear here.";
  const emptyState = (message: string, showCta: boolean) => (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-12 px-4 shadow-sm">
      <div className="flex flex-col items-center justify-center gap-5 text-center max-w-sm mx-auto">
        <Inbox className="h-12 w-12 text-slate-400" aria-hidden />
        <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
        {showCta && (
          <Link href="/dashboard/add-trade">
            <Button
              className="gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ backgroundColor: "var(--primary-cta)" }}
            >
              <Plus className="h-4 w-4" />
              Post a swap
            </Button>
          </Link>
        )}
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
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="My swaps list">
            <button
              type="button"
              role="tab"
              aria-selected={mySwapsSubTab === "active"}
              onClick={() => setMySwapsSubTab("active")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1 ${
                mySwapsSubTab === "active"
                  ? "border-[var(--primary)] bg-white text-[var(--primary-cta)] shadow-sm"
                  : "border-slate-200 bg-slate-50/80 text-slate-600 hover:text-slate-900"
              }`}
            >
              Active ({mySwapsActiveRows.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mySwapsSubTab === "history"}
              onClick={() => setMySwapsSubTab("history")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1 ${
                mySwapsSubTab === "history"
                  ? "border-[var(--primary)] bg-white text-[var(--primary-cta)] shadow-sm"
                  : "border-slate-200 bg-slate-50/80 text-slate-600 hover:text-slate-900"
              }`}
            >
              History
            </button>
          </div>
          {displayedMySwaps.length === 0 ? (
            emptyState(
              mySwapsSubTab === "active" ? activeEmptyMessage : historyEmptyMessage,
              mySwapsSubTab === "active"
            )
          ) : (
            <ul className="space-y-4">
              {displayedMySwaps.map((item) => (
                <li key={`${item.source}-${item.id}`}>
                  <div
                    className={`rounded-xl border bg-white shadow-sm overflow-hidden ${
                      item.statusPill === "active"
                        ? "border-s-4 border-s-[var(--primary)] border-slate-200"
                        : item.statusPill === "pending"
                          ? "border-s-4 border-s-amber-500 border-slate-200"
                          : item.statusPill === "expired" || item.statusPill === "cancelled"
                            ? "border-s-4 border-s-slate-400 border-slate-200"
                            : "border-s-4 border-s-[var(--accent)] border-slate-200"
                    }`}
                  >
                    <SwapPostTradeBoardCard
                      post={item.post as Parameters<typeof SwapPostTradeBoardCard>[0]["post"]}
                      isPreview
                      statusPill={item.statusPill}
                    />
                    {mySwapsSubTab === "active" && item.recordStatus === "OPEN" && item.statusPill === "active" && (
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

      {activeTab === "tradeBoard" && <TradeBoardSection mode="tradeBoard" />}

      {activeTab === "vacationSwap" && <TradeBoardSection mode="vacationSwap" />}

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
