"use client";

import Image from "next/image";
import { forwardRef } from "react";
import type { getTranslator } from "@/i18n/getTranslator";

type T = ReturnType<typeof getTranslator>;

const VISUAL_STEPS = [
  { src: "/schedule-guide/saudia/01-applications.png", width: 521, height: 1024 },
  { src: "/schedule-guide/saudia/02-crew-portal.png", width: 504, height: 1024 },
  { src: "/schedule-guide/saudia/03-awarded-line.png", width: 1024, height: 734 },
  { src: "/schedule-guide/saudia/04-export-pdf.png", width: 470, height: 1024 },
  { src: "/schedule-guide/saudia/05-pdf-open.png", width: 471, height: 1024 },
] as const;

const STEP_I18N = [
  {
    text: "dashboard.scheduleTutorialSaudiaStep1" as const,
    alt: "dashboard.scheduleTutorialStepImageAlt1" as const,
  },
  {
    text: "dashboard.scheduleTutorialSaudiaStep2" as const,
    alt: "dashboard.scheduleTutorialStepImageAlt2" as const,
  },
  {
    text: "dashboard.scheduleTutorialSaudiaStep3" as const,
    alt: "dashboard.scheduleTutorialStepImageAlt3" as const,
  },
  {
    text: "dashboard.scheduleTutorialSaudiaStep4" as const,
    alt: "dashboard.scheduleTutorialStepImageAlt4" as const,
  },
  {
    text: "dashboard.scheduleTutorialSaudiaStep5" as const,
    alt: "dashboard.scheduleTutorialStepImageAlt5" as const,
  },
];

export type ScheduleUploadTutorialProps = {
  t: T;
  detailsOpen: boolean;
  onDetailsOpenChange: (open: boolean) => void;
};

export const ScheduleUploadTutorial = forwardRef<HTMLElement, ScheduleUploadTutorialProps>(
  function ScheduleUploadTutorial({ t, detailsOpen, onDetailsOpenChange }, ref) {
    return (
      <section
        ref={ref}
        id="schedule-export-guide"
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4 scroll-mt-4"
      >
        <h2 className="text-sm font-semibold text-slate-900">{t("dashboard.scheduleTutorialTitle")}</h2>

        <div className="space-y-3 text-sm text-slate-700">
          <p className="text-xs text-slate-600 leading-relaxed">{t("dashboard.scheduleTutorialStepsLead")}</p>
          <ol className="mt-1 list-decimal space-y-1 ps-5 text-slate-600 text-xs sm:text-sm">
            <li>{t("dashboard.scheduleTutorialSaudiaStep1")}</li>
            <li>{t("dashboard.scheduleTutorialSaudiaStep2")}</li>
            <li>{t("dashboard.scheduleTutorialSaudiaStep3")}</li>
            <li>{t("dashboard.scheduleTutorialSaudiaStep4")}</li>
            <li>{t("dashboard.scheduleTutorialSaudiaStep5")}</li>
          </ol>

          <details
            className="mt-2"
            open={detailsOpen}
            onToggle={(e) => onDetailsOpenChange(e.currentTarget.open)}
          >
            <summary className="cursor-pointer text-xs font-medium text-[#1E6FB9]">
              {t("dashboard.scheduleTutorialShowHow")}
            </summary>
            <div className="mt-4 space-y-6 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500">{t("dashboard.scheduleTutorialVisualIntro")}</p>
              {VISUAL_STEPS.map((img, i) => {
                const keys = STEP_I18N[i];
                return (
                  <div key={img.src} className="space-y-2">
                    <p className="text-xs font-semibold text-slate-800">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-2 text-[0.7rem] tabular-nums text-slate-700">
                        {i + 1}
                      </span>{" "}
                      <span className="align-middle">{t(keys.text)}</span>
                    </p>
                    <figure className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2 sm:p-3">
                      <Image
                        src={img.src}
                        alt={t(keys.alt)}
                        width={img.width}
                        height={img.height}
                        className="mx-auto h-auto w-full max-w-[min(100%,24rem)] rounded-md"
                        sizes="(max-width: 640px) 100vw, 360px"
                        loading={i === 0 ? "eager" : "lazy"}
                        decoding="async"
                      />
                    </figure>
                  </div>
                );
              })}
            </div>
          </details>
        </div>

        <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">{t("dashboard.scheduleTutorialFootnote")}</p>
      </section>
    );
  }
);
