"use client";

import { useState } from "react";
import { ScheduleUploadCard } from "@/components/schedule/ScheduleUploadCard";
import { ScheduleUploadTutorial } from "@/components/schedule/ScheduleUploadTutorial";
import { CalendarMonth } from "@/components/schedule/CalendarMonth";
import { useDashboardLocale } from "@/contexts/DashboardLocaleContext";
import { getTranslator } from "@/i18n/getTranslator";

export function SchedulePageClient() {
  const [refreshKey, setRefreshKey] = useState(0);
  const locale = useDashboardLocale();
  const t = getTranslator(locale);

  return (
    <>
      <ScheduleUploadTutorial t={t} />
      <ScheduleUploadCard t={t} onUploadSuccess={() => setRefreshKey((k) => k + 1)} />
      <section>
        <CalendarMonth refreshKey={refreshKey} />
      </section>
    </>
  );
}
