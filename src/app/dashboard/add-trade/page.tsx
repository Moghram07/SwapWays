"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import type { TripOption } from "@/components/swap-post/TripSelector";
import type { WantCriteriaData, QuickPostOfferedTripData, QuickPostLegEntry } from "@/types/swapPost";
import { parseWantAcceptanceOptions } from "@/lib/wantAcceptanceOptions";
import { getScheduledDaysFromTrips } from "@/utils/scheduledDays";
import { roundLayoverHours } from "@/utils/timeUtils";
import type { SwapPostInputSource } from "@/types/swapPost";
import { useUserAccess } from "@/hooks/useUserAccess";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { useDashboardLocale } from "@/contexts/DashboardLocaleContext";
import { getTranslator } from "@/i18n/getTranslator";

const QuickPostForm = dynamic(
  () => import("@/components/swap-post/QuickPostForm").then((m) => ({ default: m.QuickPostForm })),
  {
    loading: () => (
      <div className="mx-auto max-w-2xl space-y-3 py-4" aria-hidden>
        <div className="h-10 rounded-lg bg-surface-2 animate-pulse" />
        <div className="h-48 rounded-xl border border-line bg-surface-2/80 animate-pulse" />
      </div>
    ),
  }
);

const PostPreview = dynamic(
  () => import("@/components/swap-post/PostPreview").then((m) => ({ default: m.PostPreview })),
  { loading: () => <div className="h-48 animate-pulse rounded-xl bg-surface-2" /> }
);

const defaultManualWantCriteria: WantCriteriaData = {
  wantType: "LAYOVER",
  wantTripTypes: [],
  wantMinLayover: null,
  wantMinCredit: null,
  wantMaxCredit: null,
  wantEqualHours: false,
  wantSameDate: false,
  wantDestinations: [],
  wantExclude: [],
  wantOpenToAnyDestination: false,
  wantAcceptanceOptions: [],
  wtfDays: [],
  wantDaysOff: false,
  notes: "",
};

function createInitialManualTrip(): QuickPostOfferedTripData {
  return {
    id: Date.now(),
    tripType: "TURNAROUND",
    destination: "",
    destinations: [],
    date: "",
    layoverHours: null,
    reportTime: "",
    aircraftTypeCode: "",
    blockHours: null,
    flightNumber: "",
    legs: [
      { to: "", hasLayover: false, layoverHours: null },
      { to: "", hasLayover: false, layoverHours: null },
    ],
  };
}

/** Rebuild the manual Quick-Post form trips from a saved post (for editing manual entries). */
function editPostToManualTrips(post: EditPostData): QuickPostOfferedTripData[] {
  if (!post.offeredTrips || post.offeredTrips.length === 0) return [createInitialManualTrip()];
  return post.offeredTrips.map((t, idx) => {
    const interimDests = (t.destinations ?? [])
      .map((d) => String(d).trim().toUpperCase())
      .filter(Boolean);
    const legLayovers = Array.isArray(t.legLayovers)
      ? (t.legLayovers as Array<{ legIndex: number; layoverHours?: number; hours?: number }>)
      : [];
    const legDeadheads = Array.isArray(t.legDeadheads) ? (t.legDeadheads as boolean[]) : [];
    const legs: QuickPostLegEntry[] = interimDests.map((d, i) => {
      const ll = legLayovers.find((l) => l.legIndex === i);
      const hrs = roundLayoverHours(ll?.layoverHours ?? ll?.hours ?? null);
      return {
        to: d,
        hasLayover: hrs != null && hrs > 0,
        layoverHours: hrs != null && hrs > 0 ? hrs : null,
        isDeadhead: legDeadheads[i] ?? false,
      };
    });
    // Final return leg back to base — left blank so the base-fetch effect fills it in.
    legs.push({
      to: "",
      hasLayover: false,
      layoverHours: null,
      isDeadhead: legDeadheads[interimDests.length] ?? false,
    });
    // For LAYOVER trips the duration may have been stored only at the trip level.
    if (
      t.tripType === "LAYOVER" &&
      t.layoverHours != null &&
      t.layoverHours > 0 &&
      legs.length > 1 &&
      !legs[0].hasLayover
    ) {
      legs[0] = { ...legs[0], hasLayover: true, layoverHours: roundLayoverHours(t.layoverHours) };
    }
    return {
      id: Date.now() + idx,
      tripType: (t.tripType ?? "TURNAROUND") as QuickPostOfferedTripData["tripType"],
      destination: t.destination ?? interimDests[0] ?? "",
      destinations: interimDests,
      date: t.departureDate ? new Date(t.departureDate).toISOString().slice(0, 10) : "",
      layoverHours: roundLayoverHours(t.layoverHours),
      reportTime: t.reportTime ?? "",
      aircraftTypeCode: t.aircraftType ?? "",
      blockHours: t.blockHours ?? null,
      flightNumber: t.flightNumber ?? "",
      legs,
      legDeadheads,
    };
  });
}

interface ManualPostPageProps {
  month: number;
  year: number;
  scheduledDays: number[];
  userBaseCode: string | null;
  userDisplay: { firstName: string; rank: string; base: string; baseAirportCode?: string };
  onBack: () => void;
  /** When set, the form edits this existing post (PATCH) instead of creating a new one. */
  editId?: string;
  initialOfferedTrips?: QuickPostOfferedTripData[];
  initialWantCriteria?: WantCriteriaData;
}

function ManualPostPage({ month, year, scheduledDays, userBaseCode: initialBaseCode, userDisplay, onBack, editId, initialOfferedTrips, initialWantCriteria }: ManualPostPageProps) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "preview">("form");
  const [offeredTrips, setOfferedTrips] = useState<QuickPostOfferedTripData[]>(
    initialOfferedTrips && initialOfferedTrips.length > 0 ? initialOfferedTrips : [createInitialManualTrip()]
  );
  const [wantCriteria, setWantCriteria] = useState<WantCriteriaData>(initialWantCriteria ?? defaultManualWantCriteria);
  const [selectedDaysOff, setSelectedDaysOff] = useState<number[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userBaseCode, setUserBaseCode] = useState(initialBaseCode);
  const prefilled = useRef(false);

  // Fetch the user's base airport fast (single DB query) and pre-fill the last leg.
  useEffect(() => {
    fetch("/api/user/base")
      .then((r) => r.json())
      .then((json) => {
        const code: string | null = json?.data?.baseAirportCode ?? null;
        if (!code) return;
        setUserBaseCode(code);
        if (prefilled.current) return;
        prefilled.current = true;
        setOfferedTrips((prev) =>
          prev.map((trip) => {
            const last = trip.legs[trip.legs.length - 1];
            if (last && !last.to.trim()) {
              const legs = [...trip.legs];
              legs[legs.length - 1] = { ...last, to: code };
              return { ...trip, legs };
            }
            return trip;
          })
        );
      })
      .catch(() => null);
  }, []);

  async function handleSubmit() {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(editId ? `/api/swap-posts/${editId}` : "/api/swap-posts", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postType: "OFFERING_TRIPS",
          selectedTrips: [],
          selectedDaysOff,
          wantCriteria,
          offeredTrips,
          source: "MANUAL_QUICK",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push(editId ? "/dashboard/board?mode=mySwaps" : "/dashboard/board?mode=mySwaps&posted=1");
      } else {
        setSubmitError(json.message ?? (editId ? "Failed to update. Please try again." : "Failed to post. Please try again."));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {submitError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}
      {step === "form" ? (
        <QuickPostForm
          offeredTrips={offeredTrips}
          wantCriteria={wantCriteria}
          selectedDaysOff={selectedDaysOff}
          month={month}
          year={year}
          scheduledDays={scheduledDays}
          userBaseCode={userBaseCode ?? ""}
          onOfferedTripsChange={setOfferedTrips}
          onWantCriteriaChange={setWantCriteria}
          onSelectedDaysOffChange={setSelectedDaysOff}
          onBack={onBack}
          onNext={() => setStep("preview")}
        />
      ) : (
        <PostPreview
          postType="OFFERING_TRIPS"
          selectedTrips={[]}
          selectedDaysOff={selectedDaysOff}
          wantCriteria={wantCriteria}
          offeredTrips={offeredTrips}
          // Use the base fetched for the form (userBaseCode). The page-level userDisplay base is
          // derived from the user's schedule trips, which are empty for many manual-entry users —
          // without this the preview route loses its base wrapping (e.g. AHB→JED→BHH).
          userDisplay={{ ...userDisplay, baseAirportCode: userBaseCode ?? userDisplay.baseAirportCode }}
          onPost={handleSubmit}
          onBack={() => {
            if (isSubmitting) return;
            setSubmitError(null);
            setStep("form");
          }}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}

const CreatePostFlow = dynamic(
  () => import("@/components/swap-post/CreatePostFlow").then((m) => ({ default: m.CreatePostFlow })),
  {
    loading: () => (
      <div className="mx-auto max-w-2xl space-y-4 py-4" aria-hidden>
        <div className="h-1 w-full animate-pulse rounded-full bg-surface-2" />
        <div className="h-40 rounded-xl border border-line bg-surface-2/80 animate-pulse" />
        <div className="h-32 rounded-xl border border-line bg-surface-2/80 animate-pulse" />
      </div>
    ),
  }
);

const LineSwapForm = dynamic(
  () => import("@/components/line-swap/LineSwapForm").then((m) => ({ default: m.LineSwapForm })),
  {
    loading: () => (
      <div className="mx-auto max-w-2xl space-y-3 py-4" aria-hidden>
        <div className="h-10 rounded-lg bg-surface-2 animate-pulse" />
        <div className="h-48 rounded-xl border border-line bg-surface-2/80 animate-pulse" />
      </div>
    ),
  }
);

interface EditPostOfferedTrip {
  scheduleTripId: string | null;
  tripType?: "LAYOVER" | "TURNAROUND" | "MULTI_STOP";
  destination?: string;
  destinations?: string[];
  departureDate?: string;
  layoverHours?: number | null;
  reportTime?: string | null;
  aircraftType?: string | null;
  blockHours?: number | null;
  flightNumber?: string | null;
  legLayovers?: unknown;
  legDeadheads?: unknown;
}

interface EditPostData {
  id: string;
  postType: string;
  offeredTrips: EditPostOfferedTrip[];
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
  quickTripType?: "LAYOVER" | "TURNAROUND" | "MULTI_STOP" | null;
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
  const isManualMode = typeParam === "manual";
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

    type RawTrip = {
      id: string;
      tripNumber: string;
      startDate: string;
      creditHours: number;
      blockHours?: number | null;
      tripType: string;
      legs: { flightNumber: string; departureAirport: string; arrivalAirport: string }[];
      layovers: { airport: string; durationDecimal: number }[];
    };

    const mapRawTrip = (t: RawTrip): TripOption => ({
      id: t.id,
      tripNumber: t.tripNumber,
      startDate: new Date(t.startDate),
      creditHours: t.creditHours ?? 0,
      blockHours: t.blockHours ?? null,
      tripType: t.tripType as "LAYOVER" | "TURNAROUND" | "MULTI_STOP",
      legs: t.legs ?? [],
      layovers: t.layovers ?? [],
    });

    async function load() {
      if (editId) {
        // FAST PATH: fetch post + specific trips immediately, show form right away
        const postJson = await fetch(`/api/swap-posts/${editId}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);

        if (cancelled) return;

        const post: EditPostData | null = postJson?.data ?? null;
        const specificIds = (post?.offeredTrips ?? [])
          .map((t) => t.scheduleTripId)
          .filter((id): id is string => typeof id === "string" && id.length > 0);

        const specificTrips = await Promise.all(
          specificIds.map((id) =>
            fetch(`/api/schedule/trips/${id}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((json) => (json?.data ? mapRawTrip(json.data as RawTrip) : null))
              .catch(() => null)
          )
        );

        if (cancelled) return;

        setMyTrips(specificTrips.filter((t): t is TripOption => t !== null));
        setEditPost(post);
        setLoading(false); // Render form immediately with just the selected trips

        // Load all upcoming trips in background (non-blocking — adds context for editing)
        fetch("/api/schedule/my-trips")
          .then((r) => r.json())
          .then((json) => {
            if (!cancelled) {
              const upcoming = ((json.data ?? []) as RawTrip[]).map(mapRawTrip);
              setMyTrips((prev) => {
                const existingIds = new Set(prev.map((t) => t.id));
                const newOnes = upcoming.filter((t) => !existingIds.has(t.id));
                return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
              });
            }
          })
          .catch(() => null);
      } else {
        // Normal path: load all upcoming trips
        const tripsJson = await fetch("/api/schedule/my-trips")
          .then((r) => r.json())
          .catch(() => ({ data: [] }));

        if (!cancelled) {
          setMyTrips(((tripsJson.data ?? []) as RawTrip[]).map(mapRawTrip));
          setEditPost(null);
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [editId]);

  const scheduledDays = getScheduledDaysFromTrips(myTrips, month, year);

  if (status === "loading" || (loading && !isManualMode)) {
    return (
      <div className="flex items-center justify-center py-12 text-muted">
        {t("dashboard.loading")}
      </div>
    );
  }

  if (!session?.user?.id) {
    return (
      <div className="py-12 text-center text-muted">
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
  async function handleSubmit(data: {
    postType: import("@/types/swapPost").SwapPostType;
    selectedTrips: string[];
    selectedDaysOff: number[];
    wantCriteria: WantCriteriaData;
    source?: SwapPostInputSource;
    vacationYear?: number;
    vacationMonth?: number;
    desiredVacationMonths?: number[];
  }) {
    const body: Record<string, unknown> = {
      postType: data.postType,
      selectedTrips: data.selectedTrips,
      selectedDaysOff: data.selectedDaysOff,
      wantCriteria: data.wantCriteria,
      source: data.source,
    };
    if (data.postType === "VACATION_SWAP") {
      body.vacationYear = data.vacationYear;
      body.vacationMonth = data.vacationMonth;
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
      router.push(editId ? "/dashboard/board?mode=mySwaps" : "/dashboard/board?mode=mySwaps&posted=1");
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

  if (isManualMode) {
    const baseCode = myTrips[0]?.legs[0]?.departureAirport ?? "";
    // When editing a manual post, wait for the post to load so we can prefill the form.
    if (editId && !editPost) {
      return (
        <div className="flex items-center justify-center py-12 text-muted">
          {t("dashboard.loading")}
        </div>
      );
    }
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-content">
            {editId ? t("dashboard.postEditYourPost") : "Manual entry"}
          </h1>
        </div>
        <ManualPostPage
          month={month}
          year={year}
          scheduledDays={scheduledDays}
          userBaseCode={baseCode}
          userDisplay={userDisplay}
          onBack={() => router.push("/dashboard/board?mode=mySwaps")}
          editId={editId ?? undefined}
          initialOfferedTrips={editPost ? editPostToManualTrips(editPost) : undefined}
          initialWantCriteria={initialWantCriteria}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-content">
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
            <div className="rounded-xl border border-line bg-surface p-6 text-center shadow-sm">
              <h2 className="text-xl font-semibold text-content">
                {t("dashboard.lineSwapsPremiumTitle")}
              </h2>
              <p className="mt-2 text-sm text-muted">
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
            <LineSwapForm locale={locale} editId={editId} />
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
          initialDesiredVacationMonths={editPost?.desiredVacationMonths}
          onSelectManualEntry={() => router.push("/dashboard/add-trade?type=manual")}
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
