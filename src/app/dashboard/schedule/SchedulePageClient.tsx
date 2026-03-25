"use client";

import { useState } from "react";
import { ScheduleUploadCard } from "@/components/schedule/ScheduleUploadCard";
import { CalendarMonth } from "@/components/schedule/CalendarMonth";

export function SchedulePageClient() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <ScheduleUploadCard onUploadSuccess={() => setRefreshKey((k) => k + 1)} />
      <section>
        <CalendarMonth refreshKey={refreshKey} />
      </section>
    </>
  );
}
