"use client";

import Link from "next/link";
import useSWR from "swr";
import { useState } from "react";
import { CalendarDays, ArrowLeftRight, Bell, MessageCircle, ChevronRight } from "lucide-react";
import { getTranslator } from "@/i18n/getTranslator";
import { type Locale } from "@/i18n/config";

const PRIMARY = "#1E6FB9";
const ACCENT = "#2DAF66";

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
};

type OverviewResponse = {
  data: {
    schedule: { lineNumber: string; month: number; year: number } | null;
    activeSwaps: number;
    newMatches: number;
    unreadMessages: number;
    referral: {
      referralCode: string | null;
      referralLink: string | null;
      usedReferrals: number;
      remainingReferrals: number;
      trialCapReached: boolean;
    };
    topMatches: Array<{
      postId: string;
      matchPercent: number | null;
      matchTier: "low" | "medium" | "high" | "none";
      reasons: string[];
      flightNumber: string | null;
      destination: string | null;
      tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP" | null;
      posterRank: string;
      posterBase: string;
    }>;
  };
};

function formatScheduleBadge(schedule: OverviewResponse["data"]["schedule"], locale: Locale, fallback: string): string {
  if (!schedule) return fallback;
  return `✓ Line ${schedule.lineNumber} · ${schedule.month}/${schedule.year}`;
}

function tripTypeDotClass(tripType: "LAYOVER" | "TURNAROUND" | "MULTI_STOP" | null): string {
  if (tripType === "LAYOVER") return "bg-emerald-500";
  if (tripType === "TURNAROUND") return "bg-blue-500";
  return "bg-slate-400";
}

function StatCardSkeleton() {
  return <div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />;
}

export function DashboardPageClient({ locale }: { locale: Locale }) {
  const t = getTranslator(locale);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const { data: overviewJson, isLoading } = useSWR<OverviewResponse>("/api/dashboard/overview", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const payload = overviewJson?.data;
  const topMatches = payload?.topMatches ?? [];
  const referral = payload?.referral;
  const showReferralCard = Boolean(referral);
  const whatsappHref = referral?.referralLink
    ? `https://wa.me/?text=${encodeURIComponent(`Join me on Swap Ways: ${referral.referralLink}`)}`
    : "#";
  const emailHref = referral?.referralLink
    ? `mailto:?subject=${encodeURIComponent("Join me on Swap Ways")}&body=${encodeURIComponent(
        `Use my invite link to sign up on Swap Ways:\n\n${referral.referralLink}`
      )}`
    : "#";
  const tierText = (tier: "low" | "medium" | "high" | "none") => {
    if (tier === "high") return t("dashboard.greatMatch");
    if (tier === "medium") return t("dashboard.goodMatch");
    if (tier === "low") return t("dashboard.lowMatch");
    return t("dashboard.match");
  };

  async function copyReferralLink() {
    if (!referral?.referralLink) return;
    try {
      await navigator.clipboard.writeText(referral.referralLink);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), 1800);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("dashboard.overview")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <Link
              href="/dashboard/schedule"
              prefetch={false}
              className="group rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold tracking-tight text-slate-900">
                    {formatScheduleBadge(payload?.schedule ?? null, locale, t("dashboard.upload"))}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-600">{t("dashboard.uploadSchedule")}</p>
                </div>
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors group-hover:opacity-90"
                  style={{ backgroundColor: `${PRIMARY}14` }}
                >
                  <CalendarDays className="h-5 w-5" style={{ color: PRIMARY }} strokeWidth={2} />
                </div>
              </div>
              <span className="mt-3 inline-flex items-center text-xs font-medium text-slate-500 group-hover:text-slate-700">
                {payload?.schedule ? t("dashboard.reUpload") : t("dashboard.upload")} <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
              </span>
            </Link>

            <Link
              href="/dashboard/matches"
              prefetch={false}
              className="group rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold tracking-tight text-slate-900">{payload?.activeSwaps ?? 0}</p>
                  <p className="mt-1 text-sm font-medium text-slate-600">{t("dashboard.activeSwaps")}</p>
                </div>
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors group-hover:opacity-90"
                  style={{ backgroundColor: `${ACCENT}14` }}
                >
                  <ArrowLeftRight className="h-5 w-5" style={{ color: ACCENT }} strokeWidth={2} />
                </div>
              </div>
              <span className="mt-3 inline-flex items-center text-xs font-medium text-slate-500 group-hover:text-slate-700">
                {t("dashboard.view")} <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
              </span>
            </Link>

            <Link
              href="/dashboard/trade-board?sortBy=match"
              prefetch={false}
              className="group rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold tracking-tight text-slate-900">{payload?.newMatches ?? 0}</p>
                  <p className="mt-1 text-sm font-medium text-slate-600">{t("dashboard.newMatches")}</p>
                </div>
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors group-hover:opacity-90"
                  style={{ backgroundColor: `${PRIMARY}14` }}
                >
                  <Bell className="h-5 w-5" style={{ color: PRIMARY }} strokeWidth={2} />
                </div>
              </div>
              <span className="mt-3 inline-flex items-center text-xs font-medium text-slate-500 group-hover:text-slate-700">
                {t("dashboard.view")} <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
              </span>
            </Link>

            <Link
              href="/dashboard/messages"
              prefetch={false}
              className="group rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold tracking-tight text-slate-900">{payload?.unreadMessages ?? 0}</p>
                  <p className="mt-1 text-sm font-medium text-slate-600">{t("dashboard.unreadMsgs")}</p>
                </div>
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors group-hover:opacity-90"
                  style={{ backgroundColor: `${PRIMARY}14` }}
                >
                  <MessageCircle className="h-5 w-5" style={{ color: PRIMARY }} strokeWidth={2} />
                </div>
              </div>
              <span className="mt-3 inline-flex items-center text-xs font-medium text-slate-500 group-hover:text-slate-700">
                {t("dashboard.view")} <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
              </span>
            </Link>
          </>
        )}
      </div>

      {showReferralCard ? (
        <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{t("dashboard.inviteCrewTitle")}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {t("dashboard.inviteCrewBody").replace("{used}", String(referral?.usedReferrals ?? 0))}
              </p>
              <ul className="mt-3 space-y-1 text-xs text-slate-600">
                <li>{t("dashboard.installReward")}</li>
                <li>{t("dashboard.scheduleReward")}</li>
                <li>{t("dashboard.referralReward")}</li>
                <li>{t("dashboard.capReward")}</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">{t("dashboard.referralCode")}</p>
              <p className="mt-1 text-sm font-semibold tracking-wide text-slate-900">{referral?.referralCode}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">{t("dashboard.referralLink")}</p>
              <p className="mt-1 truncate text-sm text-slate-800">{referral?.referralLink ?? t("dashboard.unavailable")}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyReferralLink}
              className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
            >
              {copyState === "copied" ? t("dashboard.copied") : copyState === "failed" ? t("dashboard.copyFailed") : t("dashboard.copyInviteLink")}
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {t("dashboard.shareWhatsapp")}
            </a>
            <a
              href={emailHref}
              className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {t("dashboard.shareEmail")}
            </a>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">{t("dashboard.topMatchesTitle")}</h2>
        <div className="relative">
          {isLoading ? (
            <ul className="space-y-3">
              {[1, 2, 3].map((i) => (
                <li key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </ul>
          ) : topMatches.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center text-sm text-slate-600">
              {t("dashboard.noMatches")}
            </p>
          ) : (
            <ul className="space-y-2">
              {topMatches.map((match) => {
                const flightLabel = match.flightNumber ? `SV${match.flightNumber}` : "Flight";
                const destination = match.destination ?? "—";
                const tripLabel = match.tripType ? match.tripType.toLowerCase() : "trip";
                return (
                  <li key={match.postId}>
                    <Link
                      href="/dashboard/trade-board?sortBy=match"
                      prefetch={false}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${tripTypeDotClass(match.tripType)}`} />
                          {match.matchPercent != null
                            ? `${Math.round(match.matchPercent)}% match`
                            : tierText(match.matchTier)}{" "}
                          · {flightLabel} {destination} {tripLabel} · {match.posterRank} · {match.posterBase}
                        </p>
                      </div>
                      <span className="ml-4 shrink-0 text-xs font-medium text-slate-600">
                        {t("dashboard.view")} <ChevronRight className="inline h-3.5 w-3.5" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
