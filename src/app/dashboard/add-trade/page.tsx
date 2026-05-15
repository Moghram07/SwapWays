"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import type { TripOption } from "@/components/swap-post/TripSelector";
import type { WantCriteriaData } from "@/types/swapPost";
import { parseWantAcceptanceOptions } from "@/lib/wantAcceptanceOptions";
import type { QuickPostOfferedTripData, SwapPostInputSource } from "@/types/swapPost";
import { isQuickPostEnabledForUser } from "@/lib/featureFlags";
import { useUserAccess } from "@/hooks/useUserAccess";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { useDashboardLocale } from "@/contexts/DashboardLocaleContext";
import { getTranslator } from "@/i18n/getTranslator";

const CreatePostFlow = dynamic(
  () => import("@/components/swap-post/CreatePostFlow").then((m) => ({ default: m.CreatePostFlow })),
  {
    loading: () => (
      <div className="mx-auto max-w-2xl space-y-4 py-4" aria-hidden>
        <div className="h-1 w-full animate-pulse rounded-full bg-slate-200" />
        <div className="h-40 rounded-xl border border-slate-200 bg-slate-50/80 animate-pulse" />
        <div className="h-32 rounded-xl border border-slate-200 bg-slate-50/80 animate-pulse" />
      </div>
    ),
  }
);

const LineSwapForm = dynamic(
  () => import("@/components/line-swap/LineSwapForm").then((m) => ({ default: m.LineSwapForm })),
  {
    loading: () => (
      <div className="mx-auto max-w-2xl space-y-3 py-4" aria-hidden>
        <div className="h-10 rounded-lg bg-slate-100 animate-pulse" />
        <div className="h-48 rounded-xl border border-slate-200 bg-slate-50/80 animate-pulse" />
      </div>
    ),
  }
);

function getScheduledDaysFromTrips(
  trips: TripOption[],
  month: number,
  year: number
): number[] {
  const set = new Set<number>();
  const monthStartUtc = Date.UTC(year, month - 1, 1);
  const monthEndUtc = Date.UTC(year, month, 1); // exclusive

  for (const t of trips) {
    const start = new Date(t.startDate);
    const lastLeg = t.legs[t.legs.length - 1];
    const end =
      lastLeg?.arrivalDate != null ? new Date(lastLeg.arrivalDate) : start;

    // Normalize to UTC day boundaries and clamp to the selected month.
    const startDayUtc = Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate()
    );
    const endDayUtc = Date.UTC(
      end.getUTCFullYear(),
      end.getUTCMonth(),
      end.getUTCDate()
    );

    const rangeStartUtc = Math.min(startDayUtc, endDayUtc);
    const rangeEndUtc = Math.max(startDayUtc, endDayUtc);

    if (rangeEndUtc < monthStartUtc || rangeStartUtc >= monthEndUtc) continue;

    const clampedStartUtc = Math.max(rangeStartUtc, monthStartUtc);
    const clampedEndUtc = Math.min(rangeEndUtc, monthEndUtc - 24 * 60 * 60 * 1000);

    for (
      let dayUtc = clampedStartUtc;
      dayUtc <= clampedEndUtc;
      dayUtc += 24 * 60 * 60 * 1000
    ) {
      set.add(new Date(dayUtc).getUTCDate());
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

interface EditPostData {
  id: string;
  postType: string;
  offeredTrips: { scheduleTripId: string | null }[];
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
  vacationYear?: number | null;
  vacationMonth?: number | null;
  vacationStartDay?: number | null;
  vacationEndDay?: number | null;
  desiredVacationMonths?: number[];
  inputSource?: SwapPostInputSource | null;
  quickTripType?: "LAYOVER" | "TURNAROUND" | "MULTI_STOP" | "PAIRING_WITH_LAYOVER" | null;
  quickDestinations?: string[];
  quickDate?: string | null;
  quickLayoverHours?: number | null;
  advancedReportTime?: string | null;
  advancedAircraftTypeCode?: string | null;
  advancedBlockHours?: number | null;
  advancedFlightNumber?: string | null;
}

export default function PostToTradeBoardPage() {
  const locale = useDashboardLocale();
  const t = getTranslator(locale);
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get("tripId");
  const typeParam = searchParams.get("type");
  const viewParam = searchParams.get("view");
  const isLineSwapMode = typeParam === "line-swap";
  const editId = searchParams.get("edit");
  const forceChooser = viewParam === "chooser";
  const initialPostType = typeParam === "vacation" ? "VACATION_SWAP" : undefined;
  const [myTrips, setMyTrips] = useState<TripOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPost, setEditPost] = useState<EditPostData | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string>("line_swap");
  const [upgradeReason, setUpgradeReason] = useState<string>("");
  const { access } = useUserAccess();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    if (!editId) setEditPost(null);

    const mapTrips = (json: { data?: unknown[] }) => {
      const data = (json.data ?? []) as {
        id: string;
        tripNumber: string;
        startDate: string;
        creditHours: number;
        tripType: string;
        legs: { flightNumber: string; departureAirport: string; arrivalAirport: string }[];
        layovers: { airport: string; durationDecimal: number }[];
      }[];
      return data.map((t) => ({
        id: t.id,
        tripNumber: t.tripNumber,
        startDate: new Date(t.startDate),
        creditHours: t.creditHours ?? 0,
        tripType: t.tripType as "LAYOVER" | "TURNAROUND" | "MULTI_STOP" | "PAIRING_WITH_LAYOVER",
        legs: t.legs ?? [],
        layovers: t.layovers ?? [],
      }));
    };

    const tripsP = fetch("/api/schedule/my-trips")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setMyTrips(mapTrips(json));
      })
      .catch(() => {
        if (!cancelled) setMyTrips([]);
      });

    const editP = editId
      ? fetch(`/api/swap-posts/${editId}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((json) => {
            if (cancelled) return;
            if (json?.data) setEditPost(json.data as EditPostData);
            else setEditPost(null);
          })
          .catch(() => {
            if (!cancelled) setEditPost(null);
          })
      : Promise.resolve();

    void Promise.all([tripsP, editP]).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [editId]);

  const scheduledDays = getScheduledDaysFromTrips(myTrips, month, year);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        {t("dashboard.loading")}
      </div>
    );
  }

  if (!session?.user?.id) {
    return (
      <div className="py-12 text-center text-slate-500">
        {t("dashboard.pleaseSignIn")}
      </div>
    );
  }

  const baseAirportCode = myTrips[0]?.legs[0]?.departureAirport ?? "";
  const userDisplay = {
    firstName:
      (session.user as { name?: string }).name?.split(" ")[0] ??
      t("dashboard.crewFallback"),
    rank: t("dashboard.crewFallback"),
    base: t("dashboard.baseSuffix"),
    baseAirportCode,
  };
  const quickPostEnabled = isQuickPostEnabledForUser(session.user.id);

  async function handleSubmit(data: {
    postType: import("@/types/swapPost").SwapPostType;
    selectedTrips: string[];
    selectedDaysOff: number[];
    wantCriteria: WantCriteriaData;
    source?: SwapPostInputSource;
    offeredTrips?: QuickPostOfferedTripData[];
    vacationYear?: number;
    vacationMonth?: number;
    vacationStartDay?: number;
    vacationEndDay?: number;
    desiredVacationMonths?: number[];
  }) {
    const body: Record<string, unknown> = {
      postType: data.postType,
      selectedTrips: data.selectedTrips,
      selectedDaysOff: data.selectedDaysOff,
      wantCriteria: data.wantCriteria,
      source: data.source,
      offeredTrips: data.offeredTrips,
    };
    if (data.postType === "VACATION_SWAP") {
      body.vacationYear = data.vacationYear;
      body.vacationMonth = data.vacationMonth;
      body.vacationStartDay = data.vacationStartDay;
      body.vacationEndDay = data.vacationEndDay;
      body.desiredVacationMonths = data.desiredVacationMonths ?? [];
    }
    const url = editId ? `/api/swap-posts/${editId}` : "/api/swap-posts";
    const res = await fetch(url, {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: { data?: unknown; error?: string; message?: string };
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(res.ok ? "Invalid response from server." : editId ? "Failed to update post. Please try again." : "Failed to create post. Please try again.");
    }
    if (res.ok && json.data) {
      router.push("/dashboard/matches");
    } else if (json.message) {
      throw new Error(json.message);
    } else if (!res.ok) {
      throw new Error(editId ? "Failed to update post. Please try again." : "Failed to create post. Please try again.");
    }
  }

  const initialSelectedTripIds = editPost
    ? editPost.offeredTrips
        .map((t) => t.scheduleTripId)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    : tripId
      ? [tripId]
      : undefined;
  const initialWantCriteria: WantCriteriaData | undefined = editPost
    ? (() => {
        const isLegacyAnything = editPost.wantType === "ANYTHING";
        const wantType = (isLegacyAnything ? "LAYOVER" : editPost.wantType) as WantCriteriaData["wantType"];
        const destLen = editPost.wantDestinations?.length ?? 0;
        const wantOpenToAnyDestination =
          isLegacyAnything ||
          (destLen === 0 &&
            editPost.wantType !== "DAYS_OFF" &&
            editPost.wantType !== "SPECIFIC" &&
            editPost.wantType !== "ANYTHING");
        return {
          wantType,
          wantTripTypes: (editPost.wantTripTypes ?? []) as WantCriteriaData["wantTripTypes"],
          wantMinLayover: editPost.wantMinLayover ?? null,
          wantMinCredit: editPost.wantMinCredit ?? null,
          wantMaxCredit: editPost.wantMaxCredit ?? null,
          wantEqualHours: editPost.wantEqualHours ?? false,
          wantSameDate: editPost.wantSameDate ?? false,
          wantDestinations: wantOpenToAnyDestination ? [] : (editPost.wantDestinations ?? []),
          wantExclude: editPost.wantExclude ?? [],
          wantOpenToAnyDestination,
          wantAcceptanceOptions: parseWantAcceptanceOptions(editPost.wantAcceptanceOptions),
          wtfDays: editPost.wtfDays ?? [],
          wantDaysOff: editPost.wantDaysOff ?? false,
          notes: editPost.notes ?? "",
        };
      })()
    : undefined;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {isLineSwapMode
            ? t("dashboard.postLineSwap")
            : editId
              ? t("dashboard.postEditYourPost")
              : t("dashboard.postASwap")}
        </h1>
      </div>
      {isLineSwapMode ? (
        <div className="mx-auto max-w-2xl">
          {access && !access.canPostLineSwap ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                {t("dashboard.lineSwapsPremiumTitle")}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {t("dashboard.lineSwapsPremiumBody")}
              </p>
              <button
                type="button"
                onClick={() => {
                  setUpgradeFeature("line_swap");
                  setUpgradeReason(t("dashboard.lineSwapUpgradeReason"));
                  setShowUpgradeModal(true);
                }}
                className="mt-4 rounded-lg bg-[#2668B0] px-4 py-2.5 text-sm font-medium text-white"
              >
                {t("dashboard.upgradeToPremiumCta")}
              </button>
            </div>
          ) : (
            <LineSwapForm locale={locale} />
          )}
        </div>
      ) : (
        <CreatePostFlow
          key={`${tripId ?? "none"}-${typeParam ?? "none"}-${editId ?? "none"}-${viewParam ?? "none"}`}
          myTrips={myTrips}
          scheduledDays={scheduledDays}
          month={month}
          year={year}
          userDisplay={userDisplay}
          onSubmit={handleSubmit}
          initialSelectedTripIds={forceChooser ? undefined : initialSelectedTripIds}
          initialPostType={forceChooser ? undefined : (editPost?.postType as import("@/types/swapPost").SwapPostType) ?? initialPostType}
          initialPostId={forceChooser ? undefined : editId ?? undefined}
          initialWantCriteria={initialWantCriteria}
          initialSelectedDaysOff={editPost?.offeredDaysOff}
          initialVacationYear={editPost?.vacationYear != null ? editPost.vacationYear : undefined}
          initialVacationMonth={editPost?.vacationMonth != null ? editPost.vacationMonth : undefined}
          initialVacationStartDay={editPost?.vacationStartDay != null ? editPost.vacationStartDay : undefined}
          initialVacationEndDay={editPost?.vacationEndDay != null ? editPost.vacationEndDay : undefined}
          initialDesiredVacationMonths={editPost?.desiredVacationMonths}
          onSelectLineSwap={() => {
            if (access && !access.canPostLineSwap) {
              setUpgradeFeature("line_swap");
              setUpgradeReason(t("dashboard.lineSwapUpgradeReason"));
              setShowUpgradeModal(true);
              return;
            }
            router.push("/dashboard/add-trade?type=line-swap");
          }}
          canPostVacationSwap={access?.canPostVacationSwap ?? true}
          onPremiumRequired={(feature, reason) => {
            setUpgradeFeature(feature);
            setUpgradeReason(reason);
            setShowUpgradeModal(true);
          }}
          quickPostEnabled={quickPostEnabled}
        />
      )}
      <UpgradeModal
        isOpen={showUpgradeModal}
        feature={upgradeFeature}
        reason={upgradeReason}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
