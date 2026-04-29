"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      // Local production testing is more reliable without SW interception/caching.
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister();
        });
      });
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => {
        console.error("Service worker registration failed", err);
      });
  }, []);

  return null;
}

