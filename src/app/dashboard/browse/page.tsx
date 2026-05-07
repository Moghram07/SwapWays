import { BrowseTradesClient } from "./BrowseTradesClient";
import { getDashboardLocale } from "../_lib/locale";
import { getTranslator } from "@/i18n/getTranslator";

export default async function BrowsePage() {
  const locale = await getDashboardLocale();
  const t = getTranslator(locale);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1a365d]">{t("dashboard.browseTradesTitle")}</h1>
      <BrowseTradesClient />
    </div>
  );
}
