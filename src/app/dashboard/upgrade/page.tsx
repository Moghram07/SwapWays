import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/i18n/config";
import { getTranslator } from "@/i18n/getTranslator";

function FeatureRow({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="text-lg">{icon}</span>
      <span className="text-sm text-gray-700">{children}</span>
    </li>
  );
}

export default async function UpgradePage() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  const t = getTranslator(locale);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">{t("dashboard.upgradeTitle")}</h1>
      <p className="mb-8 text-center text-gray-700">
        {t("dashboard.upgradeSubtitle")}
      </p>

      <div className="mx-auto mb-8 max-w-md rounded-2xl border-2 border-[#2668B0] bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h2 className="mb-1 text-2xl font-bold text-gray-900">{t("dashboard.premium")}</h2>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-gray-900">15</span>
            <span className="text-gray-500">{t("dashboard.perMonth")}</span>
          </div>
        </div>

        <ul className="mb-6 space-y-3">
          <FeatureRow icon="🎯">{t("dashboard.exactMatchPercentages")}</FeatureRow>
          <FeatureRow icon="🧭">{t("dashboard.topMatchesCard")}</FeatureRow>
          <FeatureRow icon="💬">{t("dashboard.unlimitedConversations")}</FeatureRow>
          <FeatureRow icon="🧾">{t("dashboard.fullConversationHistory")}</FeatureRow>
          <FeatureRow icon="📋">{t("dashboard.lineSwaps")}</FeatureRow>
          <FeatureRow icon="🏖️">{t("dashboard.vacationSwaps")}</FeatureRow>
          <FeatureRow icon="📝">{t("dashboard.fullNotes")}</FeatureRow>
          <FeatureRow icon="📅">{t("dashboard.activeUntilTripDate")}</FeatureRow>
          <FeatureRow icon="⭐">{t("dashboard.priorityPlacement")}</FeatureRow>
          <FeatureRow icon="🔔">{t("dashboard.pushNotifications")}</FeatureRow>
          <FeatureRow icon="🔍">{t("dashboard.bestMatchSorting")}</FeatureRow>
          <FeatureRow icon="📂">{t("dashboard.unlimitedUploads")}</FeatureRow>
        </ul>

        <button
          disabled
          className="w-full cursor-not-allowed rounded-xl bg-gray-300 py-3 font-medium text-gray-700"
        >
          {t("dashboard.upgradeComingSoon")}
        </button>
        <p className="mt-2 text-center text-xs text-gray-500">{t("dashboard.paymentsAtLaunch")}</p>
      </div>

      <div className="mx-auto max-w-md rounded-xl bg-gray-50 p-6 text-center">
        <h3 className="mb-3 font-semibold text-gray-900">{t("dashboard.freeTierIncludes")}</h3>
        <ul className="space-y-1.5 text-left text-sm text-gray-700">
          <li>✓ {t("dashboard.freeTripSwaps")}</li>
          <li>✓ {t("dashboard.freeBrowseBoard")}</li>
          <li>✓ {t("dashboard.freeConversations")}</li>
          <li>✓ {t("dashboard.freeUploads")}</li>
          <li>✓ {t("dashboard.freeIndicators")}</li>
          <li className="text-gray-500">✗ {t("dashboard.lockedLineVacation")}</li>
          <li className="text-gray-500">✗ {t("dashboard.lockedAdvancedFilters")}</li>
          <li className="text-gray-500">✗ {t("dashboard.lockedExactPercentages")}</li>
          <li className="text-gray-500">✗ {t("dashboard.lockedTopMatchDetails")}</li>
          <li className="text-gray-500">✗ {t("dashboard.lockedHistory")}</li>
          <li className="text-gray-500">✗ {t("dashboard.lockedFullNotes")}</li>
        </ul>
      </div>
    </div>
  );
}
