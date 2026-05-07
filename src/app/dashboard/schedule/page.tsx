import { SchedulePageClient } from "./SchedulePageClient";
import { getDashboardLocale } from "../_lib/locale";
import { getTranslator } from "@/i18n/getTranslator";

export default async function SchedulePage() {
  const locale = await getDashboardLocale();
  const t = getTranslator(locale);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("dashboard.scheduleTitle")}</h1>
        <p className="mt-2 text-slate-600">{t("dashboard.scheduleSubtitle")}</p>
      </div>

      <SchedulePageClient />
    </div>
  );
}
