"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackClientEvent } from "@/lib/analytics/client";

export function AnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    void trackClientEvent({
      eventName: "page_view",
      path: pathname,
      properties: { route: pathname },
    });
  }, [pathname]);

  return null;
}
