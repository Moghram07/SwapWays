"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { CreatePostFlow } from "@/components/swap-post/CreatePostFlow";
import { LineSwapForm } from "@/components/line-swap/LineSwapForm";
import type { TripOption } from "@/components/swap-post/TripSelector";
import type { WantCriteriaData } from "@/types/swapPost";

function getScheduledDaysFromTrips(
  trips: TripOption[],
  month: number,
  year: number
): number[] {
  const set = new Set<number>();
  for (const t of trips) {
    const start = new Date(t.startDate);
    const lastLeg = t.legs[t.legs.length - 1];
    const end =
      lastLeg?.arrivalDate != null ? new Date(lastLeg.arrivalDate) : start;
    if (start.getUTCFullYear() !== year || start.getUTCMonth() + 1 !== month)
      continue;
    const startDay = start.getUTCDate();
    const endDay = end.getUTCDate();
    for (let d = Math.min(startDay, endDay); d <= Math.max(startDay, endDay); d++)
      set.add(d);
  }
  return Array.from(set);
}

interface EditPostData {
  id: string;
  postType: string;
  offeredTrips: { scheduleTripId: string }[];
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
  wtfDays: number[];
  wantDaysOff: boolean;
  notes: string | null;
  vacationYear?: number | null;
  vacationMonth?: number | null;
  vacationStartDay?: number | null;
  vacationEndDay?: number | null;
  desiredVacationMonths?: number[];
}

export default function PostToTradeBoardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get("tripId");
  const typeParam = searchParams.get("type");
  const isLineSwapMode = typeParam === "line-swap";
  const editId = searchParams.get("edit");
  const initialPostType = typeParam === "vacation" ? "VACATION_SWAP" : undefined;
  const [myTrips, setMyTrips] = useState<TripOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPost, setEditPost] = useState<EditPostData | null>(null);
  const [editLoading, setEditLoading] = useState(!!editId);
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  useEffect(() => {
    if (!editId) {
      setEditLoading(false);
      return;
    }
    fetch(`/api/swap-posts/${editId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data) setEditPost(json.data as EditPostData);
      })
      .catch(() => setEditPost(null))
      .finally(() => setEditLoading(false));
  }, [editId]);

  useEffect(() => {
    fetch("/api/schedule/my-trips")
      .then((r) => r.json())
      .then((json) => {
        const data = json.data ?? [];
        const options: TripOption[] = data.map(
          (t: {
            id: string;
            tripNumber: string;
            startDate: string;
            creditHours: number;
            tripType: string;
            legs: { flightNumber: string; departureAirport: string; arrivalAirport: string }[];
            layovers: { airport: string; durationDecimal: number }[];
          }) => ({
            id: t.id,
            tripNumber: t.tripNumber,
            startDate: new Date(t.startDate),
            creditHours: t.creditHours ?? 0,
            tripType: t.tripType as "LAYOVER" | "TURNAROUND" | "MULTI_STOP",
            legs: t.legs ?? [],
            layovers: t.layovers ?? [],
          })
        );
        setMyTrips(options);
      })
      .catch(() => setMyTrips([]))
      .finally(() => setLoading(false));
  }, []);

  const scheduledDays = getScheduledDaysFromTrips(myTrips, month, year);

  if (status === "loading" || loading || (editId && editLoading)) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        Loading…
      </div>
    );
  }

  if (!session?.user?.id) {
    return (
      <div className="py-12 text-center text-slate-500">
        Please sign in.
      </div>
    );
  }

  const userDisplay = {
    firstName: (session.user as { name?: string }).name?.split(" ")[0] ?? "Crew",
    rank: "Crew",
    base: "Base",
  };

  async function handleSubmit(data: {
    postType: import("@/types/swapPost").SwapPostType;
    selectedTrips: string[];
    selectedDaysOff: number[];
    wantCriteria: WantCriteriaData;
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
    ? editPost.offeredTrips.map((t) => t.scheduleTripId)
    : tripId
      ? [tripId]
      : undefined;
  const initialWantCriteria: WantCriteriaData | undefined = editPost
    ? {
        wantType: editPost.wantType as WantCriteriaData["wantType"],
        wantTripTypes: (editPost.wantTripTypes ?? []) as WantCriteriaData["wantTripTypes"],
        wantMinLayover: editPost.wantMinLayover ?? null,
        wantMinCredit: editPost.wantMinCredit ?? null,
        wantMaxCredit: editPost.wantMaxCredit ?? null,
        wantEqualHours: editPost.wantEqualHours ?? false,
        wantSameDate: editPost.wantSameDate ?? false,
        wantDestinations: editPost.wantDestinations ?? [],
        wantExclude: editPost.wantExclude ?? [],
        wtfDays: editPost.wtfDays ?? [],
        wantDaysOff: editPost.wantDaysOff ?? false,
        notes: editPost.notes ?? "",
      }
    : undefined;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {isLineSwapMode ? "Line Swap" : editId ? "Edit your post" : "Post to Trade Board"}
        </h1>
      </div>
      {isLineSwapMode ? (
        <div className="mx-auto max-w-2xl">
          <LineSwapForm />
        </div>
      ) : (
        <CreatePostFlow
          myTrips={myTrips}
          scheduledDays={scheduledDays}
          month={month}
          year={year}
          userDisplay={userDisplay}
          onSubmit={handleSubmit}
          initialSelectedTripIds={initialSelectedTripIds}
          initialPostType={(editPost?.postType as import("@/types/swapPost").SwapPostType) ?? initialPostType}
          initialPostId={editId ?? undefined}
          initialWantCriteria={initialWantCriteria}
          initialSelectedDaysOff={editPost?.offeredDaysOff}
          initialVacationYear={editPost?.vacationYear != null ? editPost.vacationYear : undefined}
          initialVacationMonth={editPost?.vacationMonth != null ? editPost.vacationMonth : undefined}
          initialVacationStartDay={editPost?.vacationStartDay != null ? editPost.vacationStartDay : undefined}
          initialVacationEndDay={editPost?.vacationEndDay != null ? editPost.vacationEndDay : undefined}
          initialDesiredVacationMonths={editPost?.desiredVacationMonths}
          onSelectLineSwap={() => router.push("/dashboard/add-trade?type=line-swap")}
        />
      )}
    </div>
  );
}
