"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";

const DashboardLocaleContext = createContext<Locale | null>(null);

export function DashboardLocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <DashboardLocaleContext.Provider value={locale}>{children}</DashboardLocaleContext.Provider>
  );
}

/** Locale from dashboard layout (cookie); matches SSR and hydration. */
export function useDashboardLocale(): Locale {
  const v = useContext(DashboardLocaleContext);
  return v ?? DEFAULT_LOCALE;
}
