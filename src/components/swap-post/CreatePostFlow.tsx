"use client";

import { useState } from "react";
import type { SwapPostType } from "@/types/swapPost";
import type { WantCriteriaData } from "@/types/swapPost";
import { PostTypeSelector } from "./PostTypeSelector";
import { TripSelector, type TripOption } from "./TripSelector";
import { WantCriteria } from "./WantCriteria";
import { PostPreview } from "./PostPreview";
import { VacationSwapFields } from "@/components/trade/VacationSwapFields";
import { QuickPostForm } from "./QuickPostForm";
import type { QuickPostOfferedTripData, SwapPostInputSource } from "@/types/swapPost";
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
    offeredTrips?: QuickPostOfferedTripData[];
    vacationYear?: number;
    vacationMonth?: number;
    vacationStartDay?: number;
    vacationEndDay?: number;
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
  initialVacationStartDay?: number | "";
  initialVacationEndDay?: number | "";
  initialDesiredVacationMonths?: number[];
  onSelectLineSwap?: () => void;
  quickPostEnabled?: boolean;
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
  initialVacationStartDay,
  initialVacationEndDay,
  initialDesiredVacationMonths,
  onSelectLineSwap,
  quickPostEnabled = true,
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
    initialPostType ?? (hasPreselected ? "OFFERING_TRIPS" : hasInitialType ? "VACATION_SWAP" : null)
  );
  const [selectedTrips, setSelectedTrips] = useState<string[]>(
    (initialSelectedTripIds && (hasPreselected || isEditMode)) ? [...initialSelectedTripIds] : []
  );
  const [selectedDaysOff, setSelectedDaysOff] = useState<number[]>(initialSelectedDaysOff ?? []);
  const [vacationYear, setVacationYear] = useState<number | "">(initialVacationYear ?? "");
  const [vacationMonth, setVacationMonth] = useState<number | "">(initialVacationMonth ?? "");
  const [vacationStartDay, setVacationStartDay] = useState<number | "">(initialVacationStartDay ?? "");
  const [vacationEndDay, setVacationEndDay] = useState<number | "">(initialVacationEndDay ?? "");
  const [desiredVacationMonths, setDesiredVacationMonths] = useState<number[]>(initialDesiredVacationMonths ?? []);
  const [wantCriteria, setWantCriteria] = useState<WantCriteriaData>(() => {
    const base = initialWantCriteria ? { ...defaultWantCriteria, ...initialWantCriteria } : defaultWantCriteria;
    return {
      ...base,
      wantAcceptanceOptions: base.wantAcceptanceOptions ?? [],
      wantOpenToAnyDestination: base.wantOpenToAnyDestination ?? false,
    };
  });
  const [offeringInputMode, setOfferingInputMode] = useState<"quick" | "schedule">(
    hasPreselected || myTrips.length > 0 || !quickPostEnabled ? "schedule" : "quick"
  );
  const [offeredTrips, setOfferedTrips] = useState<QuickPostOfferedTripData[]>([
    {
      id: 1,
      tripType: "LAYOVER",
      destination: "",
      destinations: [""],
      date: "",
      layoverHours: null,
      reportTime: "",
      aircraftTypeCode: "",
      blockHours: null,
      flightNumber: "",
    },
  ]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStepIndex = steps.indexOf(step);

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
        source:
          postType === "OFFERING_TRIPS" && offeringInputMode === "quick"
            ? "MANUAL_QUICK"
            : "SCHEDULE_PREFILL",
        offeredTrips:
          postType === "OFFERING_TRIPS" && offeringInputMode === "quick"
            ? offeredTrips
            : undefined,
        ...(postType === "VACATION_SWAP" && {
          vacationYear: vacationYear === "" ? undefined : vacationYear,
          vacationMonth: vacationMonth === "" ? undefined : vacationMonth,
          vacationStartDay: vacationStartDay === "" ? undefined : vacationStartDay,
          vacationEndDay: vacationEndDay === "" ? undefined : vacationEndDay,
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
              i <= currentStepIndex ? "bg-[#2668B0]" : "bg-slate-200"
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
          canPostVacationSwap={canPostVacationSwap}
          onPremiumRequired={onPremiumRequired}
        />
      )}

      {step === "offering" && postType && (
        <>
          {postType === "OFFERING_TRIPS" && (
            <div className="space-y-4">
              {quickPostEnabled && (
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setOfferingInputMode("schedule")}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                      offeringInputMode === "schedule"
                        ? "bg-white text-[#2668B0] shadow-sm"
                        : "text-slate-600"
                    }`}
                  >
                    {t("dashboard.postFlowFromSchedule")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOfferingInputMode("quick")}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                      offeringInputMode === "quick"
                        ? "bg-white text-[#2668B0] shadow-sm"
                        : "text-slate-600"
                    }`}
                  >
                    {t("dashboard.postFlowQuickPost")}
                  </button>
                </div>
              )}

              {offeringInputMode === "quick" ? (
                <QuickPostForm
                  offeredTrips={offeredTrips}
                  wantCriteria={wantCriteria}
                  selectedDaysOff={selectedDaysOff}
                  month={month}
                  year={year}
                  scheduledDays={scheduledDays}
                  onOfferedTripsChange={setOfferedTrips}
                  onWantCriteriaChange={setWantCriteria}
                  onSelectedDaysOffChange={setSelectedDaysOff}
                  onNext={() => setStep("preview")}
                  onBack={() => setStep("type")}
                />
              ) : (
                <TripSelector
                  trips={myTrips}
                  selected={selectedTrips}
                  onChange={setSelectedTrips}
                  onNext={() => setStep("wants")}
                  onBack={() => setStep("type")}
                />
              )}
            </div>
          )}
          {postType === "VACATION_SWAP" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">{t("dashboard.postFlowVacationHelp")}</p>
              <VacationSwapFields
                vacationYear={vacationYear}
                vacationMonth={vacationMonth}
                vacationStartDay={vacationStartDay}
                vacationEndDay={vacationEndDay}
                desiredMonths={desiredVacationMonths}
                onVacationYearChange={setVacationYear}
                onVacationMonthChange={setVacationMonth}
                onVacationStartDayChange={setVacationStartDay}
                onVacationEndDayChange={setVacationEndDay}
                onDesiredMonthsChange={setDesiredVacationMonths}
                includeLegacyVacationYear={legacyVacationYearForPicker}
              />
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep("type")}
                  className="text-sm text-slate-500 hover:underline"
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

      {step === "wants" &&
        postType &&
        (postType === "VACATION_SWAP" || offeringInputMode === "schedule") && (
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
            offeredTrips={postType === "OFFERING_TRIPS" ? offeredTrips : undefined}
            userDisplay={userDisplay}
            vacationYear={postType === "VACATION_SWAP" ? vacationYear : undefined}
            vacationMonth={postType === "VACATION_SWAP" ? vacationMonth : undefined}
            vacationStartDay={postType === "VACATION_SWAP" ? vacationStartDay : undefined}
            vacationEndDay={postType === "VACATION_SWAP" ? vacationEndDay : undefined}
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
              setStep(offeringInputMode === "quick" ? "offering" : "wants");
            }}
          />
        </>
      )}

      {onClose && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-500 hover:underline"
          >
            {t("dashboard.postFlowCancel")}
          </button>
        </div>
      )}
    </div>
  );
}
