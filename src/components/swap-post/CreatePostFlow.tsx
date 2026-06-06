"use client";

import { useState, useCallback } from "react";
import type { SwapPostType } from "@/types/swapPost";
import type { WantCriteriaData } from "@/types/swapPost";
import { PostTypeSelector } from "./PostTypeSelector";
import { getScheduledDaysFromTrips } from "@/utils/scheduledDays";
import { TripSelector, type TripOption } from "./TripSelector";
import { WantCriteria } from "./WantCriteria";
import { PostPreview } from "./PostPreview";
import { VacationSwapFields } from "@/components/trade/VacationSwapFields";
import type { SwapPostInputSource } from "@/types/swapPost";
import { useDashboardLocale } from "@/contexts/DashboardLocaleContext";
import { getTranslator } from "@/i18n/getTranslator";

const defaultWantCriteria: WantCriteriaData = {
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

export type CreatePostStep = "type" | "offering" | "wants" | "preview";

export interface CreatePostFlowProps {
  myTrips: TripOption[];
  scheduledDays: number[];
  month: number;
  year: number;
  userDisplay: { firstName: string; rank: string; base: string; baseAirportCode?: string };
  onSubmit: (data: {
    postType: SwapPostType;
    selectedTrips: string[];
    selectedDaysOff: number[];
    wantCriteria: WantCriteriaData;
    source?: SwapPostInputSource;
    vacationYear?: number;
    vacationMonth?: number;
    desiredVacationMonths?: number[];
  }) => void | Promise<void>;
  onClose?: () => void;
  /** When set, start at offering step with these trip ids pre-selected (e.g. from Swap on a flight card). */
  initialSelectedTripIds?: string[];
  /** When set, start with Vacation swap selected and go to offering step. */
  initialPostType?: SwapPostType;
  /** When set, flow is in edit mode; submit will PATCH this post id. */
  initialPostId?: string;
  /** Prefill want criteria (for edit mode). */
  initialWantCriteria?: WantCriteriaData;
  /** Reserved for backwards compatibility with older posts. */
  initialSelectedDaysOff?: number[];
  /** Prefill vacation fields (for edit mode with VACATION_SWAP). */
  initialVacationYear?: number | "";
  initialVacationMonth?: number | "";
  initialDesiredVacationMonths?: number[];
  onSelectLineSwap?: () => void;
  onSelectManualEntry?: () => void;
  canPostVacationSwap?: boolean;
  onPremiumRequired?: (feature: string, reason: string) => void;
}

const steps: CreatePostStep[] = ["type", "offering", "wants", "preview"];

export function CreatePostFlow({
  myTrips,
  scheduledDays,
  month,
  year,
  userDisplay,
  onSubmit,
  onClose,
  initialSelectedTripIds,
  initialPostType,
  initialPostId,
  initialWantCriteria,
  initialSelectedDaysOff,
  initialVacationYear,
  initialVacationMonth,
  initialDesiredVacationMonths,
  onSelectLineSwap,
  onSelectManualEntry,
  canPostVacationSwap = true,
  onPremiumRequired,
}: CreatePostFlowProps) {
  const locale = useDashboardLocale();
  const t = getTranslator(locale);
  const hasPreselected = initialSelectedTripIds != null && initialSelectedTripIds.length > 0;
  const hasInitialType = initialPostType === "VACATION_SWAP";
  const isEditMode = initialPostId != null && initialPostId !== "";
  const [step, setStep] = useState<CreatePostStep>(
    isEditMode || hasPreselected || hasInitialType ? "offering" : "type"
  );
  const [postType, setPostType] = useState<SwapPostType | null>(
    initialPostType ?? (hasPreselected || isEditMode ? "OFFERING_TRIPS" : hasInitialType ? "VACATION_SWAP" : null)
  );
  const [selectedTrips, setSelectedTrips] = useState<string[]>(
    (initialSelectedTripIds && (hasPreselected || isEditMode)) ? [...initialSelectedTripIds] : []
  );
  const [selectedDaysOff, setSelectedDaysOff] = useState<number[]>(initialSelectedDaysOff ?? []);
  const [vacationYear, setVacationYear] = useState<number | "">(initialVacationYear ?? "");
  const [vacationMonth, setVacationMonth] = useState<number | "">(initialVacationMonth ?? "");
  const [desiredVacationMonths, setDesiredVacationMonths] = useState<number[]>(initialDesiredVacationMonths ?? []);
  const [wantCriteria, setWantCriteria] = useState<WantCriteriaData>(() => {
    if (initialWantCriteria) {
      return {
        ...defaultWantCriteria,
        ...initialWantCriteria,
        wantAcceptanceOptions: initialWantCriteria.wantAcceptanceOptions ?? [],
        wantOpenToAnyDestination: initialWantCriteria.wantOpenToAnyDestination ?? false,
      };
    }
    const today = new Date();
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
    const fromDay = isCurrentMonth ? today.getDate() : 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const defaultWtfDays =
      scheduledDays.length > 0
        ? scheduledDays.filter((d) => d >= fromDay)
        : Array.from({ length: daysInMonth - fromDay + 1 }, (_, i) => i + fromDay);
    return { ...defaultWantCriteria, wtfDays: defaultWtfDays };
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStepIndex = steps.indexOf(step);

  const getScheduledDaysForMonth = useCallback(
    (m: number, y: number) => getScheduledDaysFromTrips(myTrips, m, y),
    [myTrips]
  );

  const selectedTripObjects = myTrips.filter((trip) => selectedTrips.includes(trip.id));

  const vacationSwapPolicyYear = new Date().getFullYear();
  const legacyVacationYearForPicker =
    postType === "VACATION_SWAP" &&
    typeof vacationYear === "number" &&
    (vacationYear < vacationSwapPolicyYear || vacationYear > vacationSwapPolicyYear + 1)
      ? vacationYear
      : undefined;

  async function handleSubmit() {
    if (!postType || isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        postType,
        selectedTrips,
        selectedDaysOff,
        wantCriteria,
        source: "SCHEDULE_PREFILL",
        ...(postType === "VACATION_SWAP" && {
          vacationYear: vacationYear === "" ? undefined : vacationYear,
          vacationMonth: vacationMonth === "" ? undefined : vacationMonth,
          desiredVacationMonths: desiredVacationMonths.length ? desiredVacationMonths : undefined,
        }),
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("dashboard.postFlowSubmitFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress bar */}
      <div className="mb-6 flex gap-1">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${
              i <= currentStepIndex ? "bg-[#2668B0]" : "bg-surface-2"
            }`}
          />
        ))}
      </div>

      {step === "type" && (
        <PostTypeSelector
          onSelect={(type) => {
            setPostType(type);
            setStep("offering");
          }}
          onSelectLineSwap={onSelectLineSwap}
          onSelectManualEntry={onSelectManualEntry}
          canPostVacationSwap={canPostVacationSwap}
          onPremiumRequired={onPremiumRequired}
        />
      )}

      {step === "offering" && postType && (
        <>
          {postType === "OFFERING_TRIPS" && (
            <div className="space-y-4">
              <TripSelector
                trips={myTrips}
                selected={selectedTrips}
                onChange={setSelectedTrips}
                onNext={() => setStep("wants")}
                onBack={() => setStep("type")}
              />
            </div>
          )}
          {postType === "VACATION_SWAP" && (
            <div className="space-y-4">
              <p className="text-sm text-muted">{t("dashboard.postFlowVacationHelp")}</p>
              <VacationSwapFields
                vacationYear={vacationYear}
                vacationMonth={vacationMonth}
                desiredMonths={desiredVacationMonths}
                onVacationYearChange={setVacationYear}
                onVacationMonthChange={setVacationMonth}
                onDesiredMonthsChange={setDesiredVacationMonths}
                includeLegacyVacationYear={legacyVacationYearForPicker}
              />
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep("type")}
                  className="rounded-lg border border-slate-800 bg-surface px-4 py-2 text-sm font-medium text-content hover:bg-surface-2"
                >
                  {t("dashboard.postFlowBack")}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("preview")}
                  disabled={
                    vacationMonth === "" ||
                    vacationYear === "" ||
                    desiredVacationMonths.length === 0
                  }
                  className="rounded-xl bg-[#2668B0] px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {t("dashboard.postFlowNext")}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {step === "wants" && postType && (
        <WantCriteria
          postType={postType}
          criteria={wantCriteria}
          onChange={setWantCriteria}
          desiredDaysOff={selectedDaysOff}
          onDesiredDaysOffChange={setSelectedDaysOff}
          scheduledDays={scheduledDays}
          month={month}
          year={year}
          onNext={() => setStep("preview")}
          onBack={() => setStep("offering")}
          getScheduledDaysForMonth={getScheduledDaysForMonth}
        />
      )}

      {step === "preview" && postType && (
        <>
          {submitError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}
          <PostPreview
            postType={postType}
            selectedTrips={selectedTripObjects}
            selectedDaysOff={selectedDaysOff}
            wantCriteria={wantCriteria}
            userDisplay={userDisplay}
            vacationYear={postType === "VACATION_SWAP" ? vacationYear : undefined}
            vacationMonth={postType === "VACATION_SWAP" ? vacationMonth : undefined}
            desiredVacationMonths={postType === "VACATION_SWAP" ? desiredVacationMonths : undefined}
            onPost={handleSubmit}
            isSubmitting={isSubmitting}
            onBack={() => {
              if (isSubmitting) return;
              setSubmitError(null);
              if (postType === "VACATION_SWAP") {
                setStep("offering");
                return;
              }
              setStep("wants");
            }}
          />
        </>
      )}

      {onClose && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted hover:underline"
          >
            {t("dashboard.postFlowCancel")}
          </button>
        </div>
      )}
    </div>
  );
}
