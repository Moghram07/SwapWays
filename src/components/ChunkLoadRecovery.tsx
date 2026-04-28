"use client";

import { useEffect } from "react";

const RECOVERY_LAST_ATTEMPT_KEY = "swapways_chunk_recovery_last_attempt_ms";
const RECOVERY_BANNER_ID = "swapways-chunk-recovery-banner";
const RECOVERY_COOLDOWN_MS = 15_000;

function isChunkLoadLikeError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("chunkloaderror") ||
    normalized.includes("loading chunk") ||
    normalized.includes("failed to fetch dynamically imported module") ||
    normalized.includes("/_next/static/chunks/")
  );
}

async function recoverFromStaleChunk() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.update().catch(() => undefined)));
    }
  } catch {
    // Best-effort refresh of SW registrations.
  }

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // Best-effort cache cleanup.
  }

  window.location.reload();
}

function showRecoveryBanner() {
  try {
    if (document.getElementById(RECOVERY_BANNER_ID)) return;

    const banner = document.createElement("div");
    banner.id = RECOVERY_BANNER_ID;
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    banner.textContent = "Updating app... one moment.";
    banner.style.position = "fixed";
    banner.style.right = "16px";
    banner.style.bottom = "16px";
    banner.style.zIndex = "2147483647";
    banner.style.padding = "10px 12px";
    banner.style.borderRadius = "10px";
    banner.style.background = "#1f2937";
    banner.style.color = "#ffffff";
    banner.style.fontSize = "13px";
    banner.style.fontWeight = "500";
    banner.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.25)";
    banner.style.fontFamily =
      'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

    document.body.appendChild(banner);
  } catch {
    // If DOM injection fails, continue recovery silently.
  }
}

export function ChunkLoadRecovery() {
  useEffect(() => {
    const handleChunkError = (raw: unknown) => {
      const message =
        raw instanceof Error
          ? raw.message
          : typeof raw === "string"
            ? raw
            : "";
      const isChunkLike = isChunkLoadLikeError(message);
      if (!isChunkLike) return;

      const now = Date.now();
      const lastAttemptRaw = sessionStorage.getItem(RECOVERY_LAST_ATTEMPT_KEY);
      const lastAttempt = lastAttemptRaw ? Number(lastAttemptRaw) : 0;
      if (Number.isFinite(lastAttempt) && now - lastAttempt < RECOVERY_COOLDOWN_MS) {
        return;
      }

      sessionStorage.setItem(RECOVERY_LAST_ATTEMPT_KEY, String(now));
      showRecoveryBanner();
      window.setTimeout(() => {
        void recoverFromStaleChunk();
      }, 800);
    };

    const onError = (event: ErrorEvent) => handleChunkError(event.error ?? event.message);
    const onUnhandledRejection = (event: PromiseRejectionEvent) => handleChunkError(event.reason);

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}

