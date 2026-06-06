import { MatchesFeedClient } from "./MatchesFeedClient";
import { getDashboardLocale } from "../_lib/locale";
import { getTranslator } from "@/i18n/getTranslator";

export default async function MatchesPage() {
  const locale = await getDashboardLocale();
  const t = getTranslator(locale);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-content">{t("dashboard.matchesTitle")}</h1>
      <p className="text-sm text-muted">{t("dashboard.matchesSubtitle")}</p>
      <MatchesFeedClient />
    </div>
  );
}
