"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useDashboardLocale } from "@/contexts/DashboardLocaleContext";
import { getTranslator } from "@/i18n/getTranslator";
import { SwapPostTradeBoardCard } from "@/components/swap-post/TradeBoardCard";
import { parseWantAcceptanceOptions } from "@/lib/wantAcceptanceOptions";
import { getAirportCity, normalizeAirportCode } from "@/utils/airportNames";
import { collapseConsecutiveAirports } from "@/utils/multiStopRouteDisplay";
function getMatchTier(percent: number): "low" | "medium" | "high" | "none" {
  if (percent >= 70) return "high";
  if (percent >= 40) return "medium";
  if (percent > 0) return "low";
  return "none";
}

interface MatchPost {
  id: string;
  userId: string;
  postType: string;
  status: string;
  offeringDaysOff: boolean;
  offeredDaysOff: number[];
  wantType: string;
  wantTripTypes: string[];
  wantMinLayover: number | null;
  wantMinCredit: number | null;
  wantMaxCredit: number | null;
  wantEqualHours: boolean;
  wantSameDate: boolean;
  wantDestinations: string[];
  wantExclude: string[];
  wantAcceptanceOptions?: unknown;
  wtfDays: number[];
  wantDaysOff: boolean;
  notes: string | null;
  createdAt: string;
  expiresAt?: string | null;
  inputSource?: string | null;
  quickTripType?: string | null;
  quickDestinations?: string[];
  quickDate?: string | null;
  quickLayoverHours?: number | null;
  advancedReportTime?: string | null;
  advancedAircraftTypeCode?: string | null;
  advancedBlockHours?: number | null;
  advancedFlightNumber?: string | null;
  vacationStartDate?: string | null;
  vacationEndDate?: string | null;
  desiredVacationStart?: string | null;
  desiredVacationEnd?: string | null;
  vacationYear?: number | null;
  vacationMonth?: number | null;
  vacationStartDay?: number | null;
  vacationEndDay?: number | null;
  desiredVacationMonths?: number[];
  matchPercent: number;
  matchReasons: string[];
  user: {
    id: string;
    firstName: string;
    lastName: string;
    tier: string;
    trialEndsAt: string;
    subscriptionStatus: string;
    rank: { name: string; code: string };
    base: { name: string; airportCode: string };
  };
  offeredTrips: {
    id: string;
    scheduleTripId?: string | null;
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
        aircraftTypeCode?: string;
        departureTime: string;
        departureDate: string;
        departureAirport: string;
        arrivalTime: string;
        arrivalDate: string;
        arrivalAirport: string;
        flyingTime: number;
      }[];
    };
  }[];
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
};

const wantTypeLabel: Record<string, string> = {
  LAYOVER: "Any layover",
  LONGER_LAYOVER: "Any layover",
  ROUND_TRIP: "Round Trip",
  ANY_FLIGHT: "Any flight",
  DAYS_OFF: "Days off",
  ANYTHING: "Anything — open to offers",
  SPECIFIC: "Specific flights",
};

function postToCard(p: MatchPost) {
  return {
    postType: p.postType,
    offeredTrips: p.offeredTrips.map((t) => {
      const legs = (t.scheduleTrip?.legs ?? []).slice();
      legs.sort((a, b) => (a.legOrder ?? 0) - (b.legOrder ?? 0));

      const firstLeg = legs[0];
      const lastLeg = legs[legs.length - 1];
      const secondLeg = legs.length >= 2 ? legs[1] : undefined;

      const baseAirportCode = p.user.base?.airportCode ?? firstLeg?.departureAirport ?? "";
      const destinationCodesOrdered = legs
        .map((l) => l.arrivalAirport)
        .filter((code) => code && code !== baseAirportCode);

      const tripType = t.tripType as "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
      const stopsDisplay =
        (tripType === "MULTI_STOP") && destinationCodesOrdered.length > 0
          ? destinationCodesOrdered.join(" → ")
          : undefined;

      const rawDestinations =
        t.destinations && t.destinations.length > 0 ? t.destinations : destinationCodesOrdered;
      const destinationsForCard = collapseConsecutiveAirports(
        rawDestinations.map((code) => normalizeAirportCode(String(code)))
      );

      return {
        flightNumber: t.flightNumber ?? "",
        destination: destinationsForCard[0] ?? normalizeAirportCode(String(t.destination)),
        destinations: destinationsForCard,
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
    wantAcceptanceOptions: parseWantAcceptanceOptions(p.wantAcceptanceOptions),
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
    matchPercent: p.matchPercent,
    matchTier: getMatchTier(p.matchPercent),
    matchReasons: p.matchReasons ?? [],
    bestTripIndex: null,
    userTier: "PREMIUM" as const,
    notesIsTruncated: false,
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

function HowMatchingWorks({ t }: { t: ReturnType<typeof getTranslator> }) {
  return (
    <div className="space-y-3 text-sm text-muted">
      <p className="font-semibold text-content">{t("dashboard.matchExplainerHardTitle")}</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>{t("dashboard.matchExplainerHardBase")}</li>
        <li>{t("dashboard.matchExplainerHardRank")}</li>
        <li>{t("dashboard.matchExplainerHardAircraft")}</li>
      </ul>
      <p className="font-semibold text-content">{t("dashboard.matchExplainerScoreTitle")}</p>
      <p>{t("dashboard.matchExplainerScoreSummary")}</p>
      <p>{t("dashboard.matchExplainerRanking")}</p>
    </div>
  );
}

export function MatchesFeedClient() {
  const locale = useDashboardLocale();
  const t = getTranslator(locale);
  const router = useRouter();

  const [messagePostId, setMessagePostId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const { data, error, isLoading } = useSWR<{ data?: MatchPost[] }>("/api/matches", fetcher, {
    refreshInterval: () => (document.visibilityState === "visible" ? 30_000 : 0),
  });

  const matches = Array.isArray(data?.data) ? data.data : [];

  const selectedPost = messagePostId ? matches.find((p) => p.id === messagePostId) : null;
  const placeholderCity = selectedPost?.offeredTrips?.[0]
    ? getAirportCity(selectedPost.offeredTrips[0].destination)
    : "";
  const messagePlaceholder = placeholderCity
    ? `Hi, I'm interested in your ${placeholderCity} layover. I have a...`
    : "Hi, I'm interested in your post…";

  function handleMessageClick(postId: string) {
    setMessagePostId(postId);
    setMessageText("");
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
      }),
    })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(json.message || "Could not start conversation");
        return json;
      })
      .then((json) => {
        setMessagePostId(null);
        if (json.data?.id) {
          router.push(`/dashboard/messages?conversation=${json.data.id}`);
        } else {
          router.push("/dashboard/messages");
        }
      })
      .catch((err) => {
        setSendError(err.message || "Something went wrong. Please try again.");
      })
      .finally(() => setSending(false));
  }

  if (isLoading) {
    return <p className="py-10 text-center text-muted">{t("dashboard.matchesLoading")}</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
        {t("dashboard.matchesErrorFallback")}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-dashed border-line bg-surface-2/70 p-8 text-center">
          <h2 className="text-lg font-semibold text-content">{t("dashboard.matchesEmptyTitle")}</h2>
          <p className="mt-2 text-sm text-muted">{t("dashboard.matchesEmptyBody")}</p>
          <Link href="/dashboard" className="mt-4 inline-block rounded-lg bg-[#2668B0] px-4 py-2 text-sm font-semibold text-white">
            {t("dashboard.browseTradesTitle")}
          </Link>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6">
          <h3 className="mb-3 text-base font-semibold text-content">{t("dashboard.matchExplainerTitle")}</h3>
          <HowMatchingWorks t={t} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <details className="rounded-2xl border border-line bg-surface-2/60 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-[#2668B0]">
          {t("dashboard.matchExplainerTitle")}
        </summary>
        <div className="mt-3">
          <HowMatchingWorks t={t} />
        </div>
      </details>

      <div className="space-y-4 max-w-2xl lg:max-w-4xl mx-auto">
        <ul className="space-y-4">
          {matches.map((post) => (
            <li key={post.id} className="w-full">
              <SwapPostTradeBoardCard
                post={postToCard(post) as Parameters<typeof SwapPostTradeBoardCard>[0]["post"]}
                onMessage={() => handleMessageClick(post.id)}
              />
            </li>
          ))}
        </ul>
      </div>

      {messagePostId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="match-conversation-title"
        >
          <div className="modal-panel w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-lg">
            <h3 id="match-conversation-title" className="text-lg font-semibold text-content">
              Start conversation
            </h3>
            {selectedPost && (
              <div className="mt-3 rounded-lg border border-line bg-surface-2/50 px-3 py-2.5 text-sm text-content-soft">
                <p className="font-medium text-content">Post summary</p>
                <p className="mt-1">
                  {selectedPost.postType === "VACATION_SWAP" ? (
                    <>
                      Offering: Vacation{" "}
                      {selectedPost.vacationYear != null && selectedPost.vacationMonth != null
                        ? `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][(selectedPost.vacationMonth ?? 1) - 1]} ${selectedPost.vacationYear}${selectedPost.vacationStartDay != null && selectedPost.vacationEndDay != null ? ` (${selectedPost.vacationStartDay}–${selectedPost.vacationEndDay})` : ""}`
                        : "—"}
                    </>
                  ) : (
                    <>
                      Offering:{" "}
                      {selectedPost.offeredTrips
                        .slice(0, 2)
                        .map((trip) => `SV${trip.flightNumber} ${getAirportCity(trip.destination)} (${trip.destination})`)
                        .join(", ")}
                      {selectedPost.offeredTrips.length > 2 && " …"}
                    </>
                  )}
                </p>
                {selectedPost.postType !== "VACATION_SWAP" && (
                  <p className="mt-0.5">
                    For: {wantTypeLabel[selectedPost.wantType] ?? "Open to offers"}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted">
                  {selectedPost.user.rank.name} · {selectedPost.user.base.name} Base
                </p>
              </div>
            )}
            <label className="mt-4 block text-sm font-medium text-content-soft">
              Message {selectedPost ? "(optional)" : ""}
            </label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={messagePlaceholder}
              className="mt-1 h-24 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-content placeholder:text-faint"
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
                className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-content-soft hover:bg-surface-2 disabled:opacity-50"
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
    </div>
  );
}
