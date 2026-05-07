"use client";

import Link from "next/link";
import useSWR from "swr";
import { useDashboardLocale } from "@/contexts/DashboardLocaleContext";
import { getTranslator } from "@/i18n/getTranslator";

type MatchItem = {
  id: string;
  matchScore?: number | null;
  status: string;
  offererId: string;
  receiverId: string;
  trade?: { destination?: string | null; departureDate?: string | null };
  offerer?: { firstName: string; lastName: string; rank?: { name?: string } };
  receiver?: { firstName: string; lastName: string; rank?: { name?: string } };
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
};

function formatDate(raw?: string | null) {
  if (!raw) return "";
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  PENDING: "dashboard.matchStatusPending",
  ACCEPTED: "dashboard.matchStatusAccepted",
  REJECTED: "dashboard.matchStatusRejected",
  EXPIRED: "dashboard.matchStatusExpired",
};

function HowMatchingWorks({ t }: { t: ReturnType<typeof getTranslator> }) {
  return (
    <div className="space-y-3 text-sm text-slate-600">
      <p className="font-semibold text-slate-900">{t("dashboard.matchExplainerHardTitle")}</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>{t("dashboard.matchExplainerHardBase")}</li>
        <li>{t("dashboard.matchExplainerHardRank")}</li>
        <li>{t("dashboard.matchExplainerHardAircraft")}</li>
      </ul>
      <p className="font-semibold text-slate-900">{t("dashboard.matchExplainerScoreTitle")}</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>{t("dashboard.matchExplainerScoreDest")}</li>
        <li>{t("dashboard.matchExplainerScoreDate")}</li>
        <li>{t("dashboard.matchExplainerScoreCredit")}</li>
        <li>{t("dashboard.matchExplainerScoreWtf")}</li>
        <li>{t("dashboard.matchExplainerScoreLayover")}</li>
      </ul>
      <p>{t("dashboard.matchExplainerRanking")}</p>
    </div>
  );
}

export function MatchesFeedClient() {
  const locale = useDashboardLocale();
  const t = getTranslator(locale);

  const { data, error, isLoading } = useSWR<{ data?: MatchItem[] }>("/api/matches", fetcher, {
    refreshInterval: () => (document.visibilityState === "visible" ? 30_000 : 0),
  });

  const matches = Array.isArray(data?.data) ? data.data : [];

  if (isLoading) {
    return <p className="py-10 text-center text-slate-500">{t("dashboard.matchesLoading")}</p>;
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
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-900">{t("dashboard.matchesEmptyTitle")}</h2>
          <p className="mt-2 text-sm text-slate-600">{t("dashboard.matchesEmptyBody")}</p>
          <Link href="/dashboard" className="mt-4 inline-block rounded-lg bg-[#2668B0] px-4 py-2 text-sm font-semibold text-white">
            {t("dashboard.browseTradesTitle")}
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="mb-3 text-base font-semibold text-slate-900">{t("dashboard.matchExplainerTitle")}</h3>
          <HowMatchingWorks t={t} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <details className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-[#2668B0]">
          {t("dashboard.matchExplainerTitle")}
        </summary>
        <div className="mt-3">
          <HowMatchingWorks t={t} />
        </div>
      </details>

      <div className="space-y-3">
        {matches.map((item) => {
          const score = item.matchScore == null ? "-" : `${Math.round(item.matchScore)}%`;
          const destination = item.trade?.destination || t("dashboard.matchDefaultDestination");
          const date = formatDate(item.trade?.departureDate);
          const userName =
            item.offerer?.firstName && item.offerer?.lastName
              ? `${item.offerer.firstName} ${item.offerer.lastName}`
              : t("dashboard.matchDefaultCrewName");
          const statusKey = STATUS_LABEL_KEYS[item.status];
          const statusLabel = statusKey ? t(statusKey) : item.status;
          return (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">{destination}</p>
                <span className="rounded-full bg-[#E3EFF9] px-2.5 py-1 text-xs font-semibold text-[#2668B0]">{score}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {userName}
                {date ? ` · ${date}` : ""}
              </p>
              <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">{statusLabel}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
