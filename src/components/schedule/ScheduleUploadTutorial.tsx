"use client";

import type { getTranslator } from "@/i18n/getTranslator";

type T = ReturnType<typeof getTranslator>;

export function ScheduleUploadTutorial({ t }: { t: T }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">{t("dashboard.scheduleTutorialTitle")}</h2>

      <div className="space-y-3 text-sm text-slate-700">
        <div>
          <p className="font-medium text-slate-800">{t("dashboard.scheduleTutorialCrewHeading")}</p>
          <ol className="mt-1 list-decimal space-y-1 ps-5 text-slate-600">
            <li>{t("dashboard.scheduleTutorialCrewStep1")}</li>
            <li>{t("dashboard.scheduleTutorialCrewStep2")}</li>
            <li>{t("dashboard.scheduleTutorialCrewStep3")}</li>
            <li>{t("dashboard.scheduleTutorialCrewStep4")}</li>
          </ol>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-medium text-[#1E6FB9]">
              {t("dashboard.scheduleTutorialShowHow")}
            </summary>
            <p className="mt-2 text-xs text-slate-500">{t("dashboard.scheduleTutorialCrewDetail")}</p>
          </details>
        </div>

        <div>
          <p className="font-medium text-slate-800">{t("dashboard.scheduleTutorialSaudiaHeading")}</p>
          <ol className="mt-1 list-decimal space-y-1 ps-5 text-slate-600">
            <li>{t("dashboard.scheduleTutorialSaudiaStep1")}</li>
            <li>{t("dashboard.scheduleTutorialSaudiaStep2")}</li>
            <li>{t("dashboard.scheduleTutorialSaudiaStep3")}</li>
            <li>{t("dashboard.scheduleTutorialSaudiaStep4")}</li>
          </ol>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-medium text-[#1E6FB9]">
              {t("dashboard.scheduleTutorialShowHow")}
            </summary>
            <p className="mt-2 text-xs text-slate-500">{t("dashboard.scheduleTutorialSaudiaDetail")}</p>
          </details>
        </div>
      </div>

      <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">{t("dashboard.scheduleTutorialFootnote")}</p>
    </section>
  );
}
