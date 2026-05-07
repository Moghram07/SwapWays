"use client";

import type { SwapPostType } from "@/types/swapPost";
import { RefreshCw, CalendarRange, CalendarDays } from "lucide-react";
import { useDashboardLocale } from "@/contexts/DashboardLocaleContext";
import { getTranslator } from "@/i18n/getTranslator";

const PRIMARY = "#1E6FB9";

const optionTypes: SwapPostType[] = ["OFFERING_TRIPS", "VACATION_SWAP"];

const optionIcons: Record<SwapPostType, React.ElementType> = {
  OFFERING_TRIPS: RefreshCw,
  VACATION_SWAP: CalendarRange,
};

interface PostTypeSelectorProps {
  onSelect: (type: SwapPostType) => void;
  onSelectLineSwap?: () => void;
  canPostVacationSwap?: boolean;
  onPremiumRequired?: (feature: string, reason: string) => void;
}

export function PostTypeSelector({
  onSelect,
  onSelectLineSwap,
  canPostVacationSwap = true,
  onPremiumRequired,
}: PostTypeSelectorProps) {
  const locale = useDashboardLocale();
  const t = getTranslator(locale);

  const optionCopy: Record<
    SwapPostType,
    { labelKey: string; descKey: string }
  > = {
    OFFERING_TRIPS: {
      labelKey: "dashboard.postTypeFlightSwap",
      descKey: "dashboard.postTypeFlightSwapDesc",
    },
    VACATION_SWAP: {
      labelKey: "dashboard.postTypeVacationSwap",
      descKey: "dashboard.postTypeVacationSwapDesc",
    },
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">{t("dashboard.postTypeChooserTitle")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {optionTypes.map((type) => {
          const Icon = optionIcons[type];
          const copy = optionCopy[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                if (type === "VACATION_SWAP" && !canPostVacationSwap) {
                  onPremiumRequired?.("vacation_swap", t("dashboard.postTypeVacationPremiumReason"));
                  return;
                }
                onSelect(type);
              }}
              className="flex items-start gap-4 rounded-xl border-2 border-slate-200 bg-white p-4 text-start transition-colors hover:border-[#2668B0] hover:bg-slate-50/50"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${PRIMARY}18` }}
              >
                <Icon className="h-5 w-5" style={{ color: PRIMARY }} />
              </div>
              <div>
                <p className="font-medium text-slate-900">{t(copy.labelKey)}</p>
                <p className="mt-0.5 text-sm text-slate-500">{t(copy.descKey)}</p>
                {type === "VACATION_SWAP" && !canPostVacationSwap ? (
                  <p className="mt-1 text-xs font-semibold text-[#2668B0]">{t("dashboard.postTypePremiumOnly")}</p>
                ) : null}
              </div>
            </button>
          );
        })}
        {onSelectLineSwap && (
          <button
            type="button"
            onClick={onSelectLineSwap}
            className="flex items-start gap-4 rounded-xl border-2 border-slate-200 bg-white p-4 text-start transition-colors hover:border-[#2668B0] hover:bg-slate-50/50"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${PRIMARY}18` }}
            >
              <CalendarDays className="h-5 w-5" style={{ color: PRIMARY }} />
            </div>
            <div>
              <p className="font-medium text-slate-900">{t("dashboard.postTypeLineSwapCardTitle")}</p>
              <p className="mt-0.5 text-sm text-slate-500">{t("dashboard.postTypeLineSwapCardDesc")}</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
