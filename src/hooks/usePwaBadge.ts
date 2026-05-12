"use client";

import { useEffect } from "react";

// Badge API — supported in Chrome 81+, Edge 81+, Safari 17.4+ (iOS PWA)
declare global {
  interface Navigator {
    setAppBadge?(count?: number): Promise<void>;
    clearAppBadge?(): Promise<void>;
  }
}

export function usePwaBadge(count: number) {
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (count > 0) {
      navigator.setAppBadge?.(count).catch(() => {});
    } else {
      navigator.clearAppBadge?.().catch(() => {});
    }
  }, [count]);
}
