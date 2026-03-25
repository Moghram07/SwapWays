"use client";

const STORAGE_KEY = "swapways_analytics_anonymous_id";

function getAnonymousId() {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (id) return id;
  id = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, id);
  return id;
}

export async function trackClientEvent(input: {
  eventName: string;
  path?: string;
  properties?: Record<string, unknown>;
}) {
  if (typeof window === "undefined") return;
  const anonymousId = getAnonymousId();
  await fetch("/api/analytics/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      eventName: input.eventName,
      path: input.path ?? window.location.pathname,
      anonymousId,
      properties: input.properties ?? {},
    }),
  }).catch(() => {});
}
