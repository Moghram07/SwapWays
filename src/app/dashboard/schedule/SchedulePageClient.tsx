"use client";

import { useEffect, useRef, useState } from "react";
import { ScheduleUploadCard } from "@/components/schedule/ScheduleUploadCard";
import { ScheduleUploadTutorial } from "@/components/schedule/ScheduleUploadTutorial";
import { CalendarMonth } from "@/components/schedule/CalendarMonth";
import { useDashboardLocale } from "@/contexts/DashboardLocaleContext";
import { getTranslator } from "@/i18n/getTranslator";
import { useAirlineCode } from "@/hooks/useAirlineCode";
import { SCHEDULE_UPLOAD_AIRLINE_CODE } from "@/constants/schedule";

export function SchedulePageClient() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [scheduleGuideOpen, setScheduleGuideOpen] = useState(false);
  const guideRef = useRef<HTMLElement>(null);
  const locale = useDashboardLocale();
  const t = getTranslator(locale);
  // Read from the session claim rather than /api/user/access so the uploader never
  // flashes for crew whose schedule format we cannot parse.
  const canUploadSchedule = useAirlineCode() === SCHEDULE_UPLOAD_AIRLINE_CODE;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#schedule-export-guide") {
      setScheduleGuideOpen(true);
      requestAnimationFrame(() => {
        guideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  function openScheduleGuide() {
    setScheduleGuideOpen(true);
    requestAnimationFrame(() => {
      guideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "#schedule-export-guide");
      }
    });
  }

  return (
    <>
      {canUploadSchedule ? (
        <>
          <ScheduleUploadTutorial
            ref={guideRef}
            t={t}
            detailsOpen={scheduleGuideOpen}
            onDetailsOpenChange={setScheduleGuideOpen}
          />
          <ScheduleUploadCard
            t={t}
            onUploadSuccess={() => setRefreshKey((k) => k + 1)}
            onShowScheduleGuide={openScheduleGuide}
          />
        </>
      ) : (
        <section className="rounded-xl border border-dashed border-line bg-surface-2/50 p-5">
          <h2 className="text-sm font-semibold text-content">
            {t("dashboard.scheduleUploadUnavailableTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {t("dashboard.scheduleUploadUnavailableBody")}
          </p>
        </section>
      )}
      <section>
        <CalendarMonth refreshKey={refreshKey} />
      </section>
    </>
  );
}
