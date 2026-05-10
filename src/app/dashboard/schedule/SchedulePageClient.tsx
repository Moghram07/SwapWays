"use client";

import { useEffect, useRef, useState } from "react";
import { ScheduleUploadCard } from "@/components/schedule/ScheduleUploadCard";
import { ScheduleUploadTutorial } from "@/components/schedule/ScheduleUploadTutorial";
import { CalendarMonth } from "@/components/schedule/CalendarMonth";
import { useDashboardLocale } from "@/contexts/DashboardLocaleContext";
import { getTranslator } from "@/i18n/getTranslator";

export function SchedulePageClient() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [scheduleGuideOpen, setScheduleGuideOpen] = useState(false);
  const guideRef = useRef<HTMLElement>(null);
  const locale = useDashboardLocale();
  const t = getTranslator(locale);

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
      <section>
        <CalendarMonth refreshKey={refreshKey} />
      </section>
    </>
  );
}
