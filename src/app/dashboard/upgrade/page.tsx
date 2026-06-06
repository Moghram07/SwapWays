import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/i18n/config";
import { getTranslator } from "@/i18n/getTranslator";

function FeatureRow({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="text-lg">{icon}</span>
      <span className="text-sm text-content-soft">{children}</span>
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
      <h1 className="mb-2 text-center text-3xl font-bold text-content">
        {locale === "ar" ? "خطة بيتا المجانية" : "Free Beta Plan"}
      </h1>
      <p className="mb-8 text-center text-content-soft">
        {locale === "ar"
          ? "جميع مزايا Swap Ways متاحة مجانًا حاليًا حتى نجمع ملاحظات المستخدمين ونحسن المنتج."
          : "All Swap Ways features are currently unlocked for free while we gather feedback and improve the product."}
      </p>

      <div className="mx-auto mb-8 max-w-md rounded-2xl border-2 border-[#2668B0] bg-surface p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h2 className="mb-1 text-2xl font-bold text-content">
            {locale === "ar" ? "كل المزايا مفعلة" : "All Features Unlocked"}
          </h2>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-content">{locale === "ar" ? "مجاني" : "Free"}</span>
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

        <div className="w-full rounded-xl bg-emerald-50 py-3 text-center font-medium text-emerald-800">
          {locale === "ar" ? "مفعل للجميع أثناء البيتا" : "Enabled for everyone during beta"}
        </div>
        <p className="mt-2 text-center text-xs text-muted">
          {locale === "ar"
            ? "ساعدنا بملاحظاتك لنقدم أفضل تجربة قبل الإطلاق التجاري."
            : "Share your feedback to help us shape the best experience before commercial launch."}
        </p>
      </div>

      <div className="mx-auto max-w-md rounded-xl bg-surface-2 p-6 text-center">
        <h3 className="mb-3 font-semibold text-content">
          {locale === "ar" ? "ما الذي نحتاجه منك الآن؟" : "What we need from you now"}
        </h3>
        <ul className="space-y-1.5 text-left text-sm text-content-soft">
          <li>✓ {locale === "ar" ? "استخدم كل المزايا بحرية" : "Use all features freely"}</li>
          <li>✓ {locale === "ar" ? "أبلغنا بأي خطأ أو بطء" : "Report any bug or slowness"}</li>
          <li>✓ {locale === "ar" ? "أرسل اقتراحاتك عبر صفحة الملاحظات" : "Send suggestions via feedback page"}</li>
          <li>✓ {locale === "ar" ? "شارك Swap Ways مع زملائك في الطاقم" : "Invite fellow crew to try Swap Ways"}</li>
        </ul>
      </div>
    </div>
  );
}
