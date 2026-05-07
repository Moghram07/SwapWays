"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TradeBoardSection } from "@/components/swap-post/TradeBoardSection";
import { LineSwapBoardSection } from "@/components/line-swap/LineSwapBoardSection";
import { MatchesClient } from "@/app/dashboard/matches/MatchesClient";
import { getTranslator } from "@/i18n/getTranslator";
import type { Locale } from "@/i18n/config";

type BoardMode = "flight" | "line" | "vacation" | "mySwaps";

export function BoardPageClient({ locale }: { locale: Locale }) {
  const t = getTranslator(locale);
  const modes: { id: BoardMode; label: string }[] = useMemo(() => {
    const tr = getTranslator(locale);
    return [
      { id: "flight", label: tr("dashboard.flights") },
      { id: "line", label: tr("dashboard.lines") },
      { id: "vacation", label: tr("dashboard.vacation") },
      { id: "mySwaps", label: tr("dashboard.mySwaps") },
    ];
  }, [locale]);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const mode = useMemo<BoardMode>(() => {
    const raw = searchParams.get("mode");
    if (raw === "line" || raw === "vacation" || raw === "mySwaps") return raw;
    return "flight";
  }, [searchParams]);

  function selectMode(next: BoardMode) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", next);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex w-full justify-center">
        <div
          className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1"
          role="tablist"
          aria-label={t("dashboard.swapType")}
        >
          {modes.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              onClick={() => selectMode(item.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                mode === item.id ? "bg-white text-[#2668B0] shadow-sm" : "text-slate-600"
              }`}
              aria-pressed={mode === item.id}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "flight" && <TradeBoardSection mode="tradeBoard" />}
      {mode === "vacation" && <TradeBoardSection mode="vacationSwap" />}
      {mode === "line" && <LineSwapBoardSection compactHeader locale={locale} />}
      {mode === "mySwaps" && <MatchesClient embeddedMySwapsOnly />}
    </div>
  );
}
