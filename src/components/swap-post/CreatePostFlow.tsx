"use client";

import { useState } from "react";
import type { SwapPostType } from "@/types/swapPost";
import type { WantCriteriaData } from "@/types/swapPost";
import { PostTypeSelector } from "./PostTypeSelector";
import { TripSelector, type TripOption } from "./TripSelector";
import { DayOffSelector } from "./DayOffSelector";
import { WantCriteria } from "./WantCriteria";
import { PostPreview } from "./PostPreview";
import { VacationSwapFields } from "@/components/trade/VacationSwapFields";

const defaultWantCriteria: WantCriteriaData = {
  wantType: "ANYTHING",
  wantTripTypes: [],
  wantMinLayover: null,
  wantMinCredit: null,
  wantMaxCredit: null,
  wantEqualHours: false,
  wantSameDate: false,
  wantDestinations: [],
  wantExclude: [],
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
  userDisplay: { firstName: string; rank: string; base: string };
  onSubmit: (data: {
    postType: SwapPostType;
    selectedTrips: string[];
    selectedDaysOff: number[];
    wantCriteria: WantCriteriaData;
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
  /** Prefill selected days off (for edit mode with OFFERING_DAYS_OFF). */
  initialSelectedDaysOff?: number[];
  /** Prefill vacation fields (for edit mode with VACATION_SWAP). */
  initialVacationYear?: number | "";
  initialVacationMonth?: number | "";
  initialVacationStartDay?: number | "";
  initialVacationEndDay?: number | "";
  initialDesiredVacationMonths?: number[];
  onSelectLineSwap?: () => void;
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
}: CreatePostFlowProps) {
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
  const [wantCriteria, setWantCriteria] = useState<WantCriteriaData>(initialWantCriteria ?? defaultWantCriteria);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentStepIndex = steps.indexOf(step);

  const selectedTripObjects = myTrips.filter((t) => selectedTrips.includes(t.id));

  async function handleSubmit() {
    if (!postType) return;
    setSubmitError(null);
    try {
      await onSubmit({
        postType,
        selectedTrips,
        selectedDaysOff,
        wantCriteria,
        ...(postType === "VACATION_SWAP" && {
          vacationYear: vacationYear === "" ? undefined : vacationYear,
          vacationMonth: vacationMonth === "" ? undefined : vacationMonth,
          vacationStartDay: vacationStartDay === "" ? undefined : vacationStartDay,
          vacationEndDay: vacationEndDay === "" ? undefined : vacationEndDay,
          desiredVacationMonths: desiredVacationMonths.length ? desiredVacationMonths : undefined,
        }),
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create post. Please try again.");
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
        />
      )}

      {step === "offering" && postType && (
        <>
          {(postType === "OFFERING_TRIPS" || postType === "GIVING_AWAY") && (
            <TripSelector
              trips={myTrips}
              selected={selectedTrips}
              onChange={setSelectedTrips}
              onNext={() => setStep("wants")}
              onBack={() => setStep("type")}
            />
          )}
          {postType === "OFFERING_DAYS_OFF" && (
            <DayOffSelector
              scheduledDays={scheduledDays}
              selected={selectedDaysOff}
              onChange={setSelectedDaysOff}
              month={month}
              year={year}
              onNext={() => setStep("wants")}
              onBack={() => setStep("type")}
            />
          )}
          {postType === "VACATION_SWAP" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Enter your vacation month and which months you are looking for.
              </p>
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
              />
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep("type")}
                  className="text-sm text-slate-500 hover:underline"
                >
                  Back
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
                  Next
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
            userDisplay={userDisplay}
            vacationYear={postType === "VACATION_SWAP" ? vacationYear : undefined}
            vacationMonth={postType === "VACATION_SWAP" ? vacationMonth : undefined}
            vacationStartDay={postType === "VACATION_SWAP" ? vacationStartDay : undefined}
            vacationEndDay={postType === "VACATION_SWAP" ? vacationEndDay : undefined}
            desiredVacationMonths={postType === "VACATION_SWAP" ? desiredVacationMonths : undefined}
            onPost={handleSubmit}
            onBack={() => { setSubmitError(null); setStep(postType === "VACATION_SWAP" ? "offering" : "wants"); }}
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
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
