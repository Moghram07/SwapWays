"use client";

import { useEffect } from "react";

export function PageViewTracker({ eventName, path }: { eventName: string; path: string }) {
  useEffect(() => {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName, path }),
    }).catch(() => {});
  }, [eventName, path]);

  return null;
}
