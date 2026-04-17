"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TradeboardFilterBar, type SwapBoardFilters } from "@/components/swap-post/TradeboardFilterBar";
import { SwapPostTradeBoardCard } from "@/components/swap-post/TradeBoardCard";
import { getAirportCity } from "@/utils/airportNames";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { useUserAccess } from "@/hooks/useUserAccess";

const defaultFilters: SwapBoardFilters = {
  postType: "",
  tripType: "",
  destination: "",
  sortBy: "match",
  routeType: "",
  dateFrom: "",
};

interface BoardPost {
  id: string;
  postType: string;
  status: string;
  offeringDaysOff: boolean;
  offeredDaysOff: number[];
  wantType: string;
  wantMinLayover: number | null;
  wantEqualHours: boolean;
  wantSameDate: boolean;
  wantDestinations: string[];
  wantExclude: string[];
  wtfDays: number[];
  wantDaysOff: boolean;
  notes: string | null;
  createdAt: string;
  matchPercent?: number | null;
  matchTier?: "low" | "medium" | "high" | "none";
  matchReasons?: string[];
  matchBreakdown?: {
    wtfDayOverlap: number;
    destinationMatch: number;
    blockHoursBalance: number;
    tripTypeMatch: number;
    sameDateBonus: number;
    layoverDuration: number;
  } | null;
  failReason?: string | null;
  bestTripIndex?: number | null;
  userTier?: "FREE" | "PREMIUM";
  notesIsTruncated?: boolean;
  user: {
    firstName: string;
    rank: { name: string; code: string };
    base: { name: string; airportCode: string };
  };
  vacationStartDate?: string;
  vacationEndDate?: string;
  desiredVacationStart?: string;
  desiredVacationEnd?: string;
  vacationYear?: number | null;
  vacationMonth?: number | null;
  vacationStartDay?: number | null;
  vacationEndDay?: number | null;
  desiredVacationMonths?: number[];
  inputSource?: "MANUAL_QUICK" | "SCHEDULE_PREFILL" | null;
  quickTripType?: "LAYOVER" | "TURNAROUND" | "MULTI_STOP" | null;
  quickDestinations?: string[];
  quickDate?: string | null;
  quickLayoverHours?: number | null;
  advancedReportTime?: string | null;
  advancedAircraftTypeCode?: string | null;
  advancedBlockHours?: number | null;
  advancedFlightNumber?: string | null;
  offeredTrips: {
    flightNumber: string | null;
    destination: string;
    destinations?: string[];
    departureDate: string;
    tripType: string;
    creditHours: number | null;
    blockHours?: number | null;
    tafb: number | null;
    hasLayover: boolean;
    layoverCity: string | null;
    layoverHours: number | null;
    reportTime?: string | null;
    aircraftType?: string | null;
    isManualEntry?: boolean;
    scheduleTrip?: {
      reportTime: string;
      legs: {
        legOrder: number;
        flightNumber: string;
        departureTime: string;
        departureDate: string;
        arrivalTime: string;
        arrivalDate: string;
        departureAirport: string;
        arrivalAirport: string;
        flyingTime: number;
      }[];
    };
  }[];
}

const wantTypeLabel: Record<string, string> = {
  LAYOVER: "Any layover",
  LONGER_LAYOVER: "Any layover",
  ROUND_TRIP: "Round Trip",
  ANY_FLIGHT: "Any flight",
  DAYS_OFF: "Days off",
  ANYTHING: "Anything — open to offers",
  SPECIFIC: "Specific flights",
};

const domesticCodes = [
  "RUH", "JED", "DMM", "MED", "AHB", "ABT", "GIZ", "ELQ", "TUU", "YNB",
  "EAM", "HAS", "DWD", "WAE", "SHW", "RAH", "RAE", "URY", "NUM", "RSI", "ULH",
];

export function TradeBoardSection({ mode = "tradeBoard" }: { mode?: "tradeBoard" | "vacationSwap" }) {
  const router = useRouter();
  const [filters, setFilters] = useState<SwapBoardFilters>(defaultFilters);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagePostId, setMessagePostId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [offeredTripId, setOfferedTripId] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean;
    feature?: string;
    reason?: string;
  }>({ open: false });
  const { access } = useUserAccess();

  const fetchBoard = useCallback(() => {
    const params = new URLSearchParams();
    if (mode === "vacationSwap") {
      params.set("postType", "VACATION_SWAP");
    } else {
      params.set("excludeVacation", "1");
      if (filters.postType) params.set("postType", filters.postType);
    }
    if (filters.tripType) params.set("tripType", filters.tripType);
    if (filters.destination) params.set("destination", filters.destination);
    if (filters.sortBy) params.set("sortBy", filters.sortBy);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    setLoading(true);
    fetch(`/api/swap-posts/board?${params}`)
      .then(async (r) => {
        const text = await r.text();
        try {
          return text ? JSON.parse(text) : {};
        } catch {
          return { data: null };
        }
      })
      .then((json) => setPosts(json.data ?? []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [filters, mode]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const filtered = posts.filter((p) => {
    if (filters.routeType === "domestic" || filters.routeType === "international") {
      const routeFilter = filters.routeType === "domestic";
      const hasDomestic =
        p.offeredTrips.some((t) => domesticCodes.includes(t.destination)) ||
        (p.quickDestinations ?? []).some((d) => domesticCodes.includes(d));
      if (routeFilter && !hasDomestic) return false;
      if (
        !routeFilter &&
        hasDomestic &&
        p.offeredTrips.every((t) => domesticCodes.includes(t.destination)) &&
        (p.quickDestinations ?? []).every((d) => domesticCodes.includes(d))
      ) return false;
    }
    return true;
  });

  const selectedPost = messagePostId ? filtered.find((p) => p.id === messagePostId) : null;
  const placeholderCity = selectedPost?.offeredTrips?.[0]
    ? getAirportCity(selectedPost.offeredTrips[0].destination)
    : "";
  const messagePlaceholder = placeholderCity
    ? `Hi, I'm interested in your ${placeholderCity} layover. I have a...`
    : "Hi, I'm interested in your post…";

  function handleMessageClick(postId: string) {
    setMessagePostId(postId);
    setMessageText("");
    setOfferedTripId("");
    setSendError(null);
  }

  function handleSendMessage() {
    if (!messagePostId) return;
    setSending(true);
    setSendError(null);
    fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        swapPostId: messagePostId,
        initialMessage: messageText.trim() || undefined,
        offeredTripId: offeredTripId || undefined,
      }),
    })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) {
          if (json?.error === "CONVERSATION_LIMIT_REACHED") {
            setUpgradeModal({
              open: true,
              feature: "multiple_conversations",
              reason: json?.message ?? "Upgrade to Premium for unlimited parallel conversations.",
            });
          }
          throw new Error(json.error ?? "Could not start conversation. Try again.");
        }
        return json;
      })
      .then((json) => {
        const convId = json.data?.id;
        if (convId) {
          setMessagePostId(null);
          router.push(`/dashboard/messages?conversation=${convId}`);
        } else {
          setSendError("Could not start conversation. Try again.");
        }
      })
      .catch((err) => setSendError(err.message ?? "Something went wrong. Try again."))
      .finally(() => setSending(false));
  }

  function postToCard(p: BoardPost) {
    return {
      postType: p.postType,
      offeredTrips: p.offeredTrips.map((t) => {
        const legs = (t.scheduleTrip?.legs ?? []).slice();
        legs.sort((a, b) => (a.legOrder ?? 0) - (b.legOrder ?? 0));

        const firstLeg = legs[0];
        const lastLeg = legs[legs.length - 1];
        const secondLeg = legs.length >= 2 ? legs[1] : undefined;

        const baseAirportCode = p.user.base?.airportCode ?? firstLeg?.departureAirport ?? "";
        const destinationCodes = legs
          .map((l) => l.arrivalAirport)
          .filter((code) => code && code !== baseAirportCode);
        const uniqueDestinations = Array.from(new Set(destinationCodes));

        const tripType = t.tripType as "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
        const stopsDisplay =
          tripType === "MULTI_STOP" && destinationCodes.length > 0
            ? destinationCodes.join(" → ")
            : undefined;

        return {
          flightNumber: t.flightNumber ?? "",
          // Row 1 "destinations" should never include base.
          // For non-multi-stop trips, this is the single off-base destination.
          destination: destinationCodes[0] ?? t.destination,
          destinations: (t.destinations && t.destinations.length > 0 ? t.destinations : uniqueDestinations),
          departureDate: new Date(t.departureDate),
          tripType,
          creditHours: t.creditHours,
          blockHours: t.blockHours ?? t.creditHours,
          tafb: t.tafb,
          hasLayover: t.hasLayover,
          layoverHours: t.layoverHours,
          reportTime: t.reportTime ?? t.scheduleTrip?.reportTime,
          departureTime: firstLeg?.departureTime,
          departureDateLeg: firstLeg?.departureDate ? new Date(firstLeg.departureDate) : undefined,
          arrivalTime: lastLeg?.arrivalTime,
          arrivalDateLeg: lastLeg?.arrivalDate ? new Date(lastLeg.arrivalDate) : undefined,
          baseAirportCode,
          departureAirport: firstLeg?.departureAirport,
          arrivalAirport: lastLeg?.arrivalAirport,
          firstLegArrivalTime: firstLeg?.arrivalTime,
          firstLegArrivalDate: firstLeg?.arrivalDate ? new Date(firstLeg.arrivalDate) : undefined,
          firstLegArrivalAirport: firstLeg?.arrivalAirport,
          secondLegDepartureTime: secondLeg?.departureTime,
          secondLegDepartureDate: secondLeg?.departureDate ? new Date(secondLeg.departureDate) : undefined,
          secondLegDepartureAirport: secondLeg?.departureAirport,
          stopsDisplay,
          // New UI needs the full leg chain for multi-stop cards.
          legs: legs.map((l) => ({
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
        };
      }),
      offeringDaysOff: p.offeringDaysOff,
      offeredDaysOff: p.offeredDaysOff,
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
      source: p.inputSource ?? undefined,
      quickTripType: p.quickTripType ?? undefined,
      quickDestinations: p.quickDestinations ?? [],
      quickDate: p.quickDate ? new Date(p.quickDate) : undefined,
      quickLayoverHours: p.quickLayoverHours ?? undefined,
      advancedReportTime: p.advancedReportTime ?? undefined,
      advancedAircraftTypeCode: p.advancedAircraftTypeCode ?? undefined,
      advancedBlockHours: p.advancedBlockHours ?? undefined,
      advancedFlightNumber: p.advancedFlightNumber ?? undefined,
      createdAt: new Date(p.createdAt),
      matchPercent: p.matchPercent ?? null,
      matchTier: p.matchTier ?? "none",
      matchReasons: p.matchReasons ?? [],
      bestTripIndex: p.bestTripIndex ?? null,
      userTier: p.userTier ?? "PREMIUM",
      notesIsTruncated: p.notesIsTruncated ?? false,
      vacationStartDate: p.vacationStartDate ? new Date(p.vacationStartDate) : undefined,
      vacationEndDate: p.vacationEndDate ? new Date(p.vacationEndDate) : undefined,
      desiredVacationStart: p.desiredVacationStart ? new Date(p.desiredVacationStart) : undefined,
      desiredVacationEnd: p.desiredVacationEnd ? new Date(p.desiredVacationEnd) : undefined,
      vacationYear: p.vacationYear ?? undefined,
      vacationMonth: p.vacationMonth ?? undefined,
      vacationStartDay: p.vacationStartDay ?? undefined,
      vacationEndDay: p.vacationEndDay ?? undefined,
      desiredVacationMonths: p.desiredVacationMonths ?? [],
    };
  }

  return (
    <div className="space-y-4">
      <TradeboardFilterBar
        filters={filters}
        onChange={setFilters}
        hasAdvancedFilters={access?.hasAdvancedFilters ?? true}
        onRequireUpgrade={() =>
          setUpgradeModal({
            open: true,
            feature: "advanced_filters",
            reason: "Advanced Trade Board filters are available on Premium.",
          })
        }
      />
      {loading ? (
        <p className="py-8 text-center text-slate-600">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-12 text-center text-slate-600">
          No posts to show.
        </p>
      ) : (
        <div className="space-y-4 max-w-2xl lg:max-w-4xl mx-auto">
          <ul className="space-y-4">
            {filtered.map((post) => (
              <li key={post.id} className="w-full">
                <SwapPostTradeBoardCard
                  post={postToCard(post) as Parameters<typeof SwapPostTradeBoardCard>[0]["post"]}
                  onMessage={() => handleMessageClick(post.id)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {messagePostId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="start-conversation-title"
        >
          <div className="modal-panel w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
            <h3 id="start-conversation-title" className="text-lg font-semibold text-slate-900">
              Start conversation
            </h3>
            {selectedPost && (
              <>
                <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Post summary</p>
                  <p className="mt-1">
                    {selectedPost.postType === "VACATION_SWAP" ? (
                      <>
                        Offering: Vacation{" "}
                        {selectedPost.vacationYear != null && selectedPost.vacationMonth != null
                          ? `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][selectedPost.vacationMonth - 1]} ${selectedPost.vacationYear}${selectedPost.vacationStartDay != null && selectedPost.vacationEndDay != null ? ` (${selectedPost.vacationStartDay}–${selectedPost.vacationEndDay})` : ""}`
                          : "—"}
                        <br />
                        Looking for:{" "}
                        {selectedPost.desiredVacationMonths?.length
                          ? selectedPost.desiredVacationMonths
                              .slice()
                              .sort((a, b) => a - b)
                              .map((m) => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1])
                              .join(", ")
                          : "—"}
                      </>
                    ) : (
                      <>
                        Offering:{" "}
                        {selectedPost.offeredTrips
                          .slice(0, 2)
                          .map((t) => `SV${t.flightNumber} ${getAirportCity(t.destination)} (${t.destination})`)
                          .join(", ")}
                        {selectedPost.offeredTrips.length > 2 && " …"}
                      </>
                    )}
                  </p>
                  {selectedPost.postType !== "VACATION_SWAP" && (
                    <p className="mt-0.5">
                      Wants: {wantTypeLabel[selectedPost.wantType] ?? "Open to offers"}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedPost.user.rank.name} · {selectedPost.user.base.name} Base
                  </p>
                </div>
                {/* When user's trips are loaded for this conversation, show: Which of your trips would you offer? + select */}
              </>
            )}
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Message {selectedPost ? "(optional)" : ""}
            </label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={selectedPost ? messagePlaceholder : "Hi, I'm interested in your post…"}
              className="mt-1 h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
              rows={4}
              disabled={sending}
            />
            {sendError && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {sendError}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMessagePostId(null)}
                disabled={sending}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={sending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50 sm:w-auto sm:min-w-[120px]"
                style={{ backgroundColor: "var(--primary-cta)" }}
              >
                {sending ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
                    Sending…
                  </>
                ) : (
                  "Send message"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <UpgradeModal
        isOpen={upgradeModal.open}
        feature={upgradeModal.feature}
        reason={upgradeModal.reason}
        onClose={() => setUpgradeModal({ open: false })}
      />
    </div>
  );
}
