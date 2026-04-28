"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, getLocaleFromPathname, localizePath, stripLocaleFromPathname } from "@/i18n/config";

type Props = {
  className?: string;
  mode?: "localize-path" | "cookie-only";
  currentLocale?: Locale;
};

export function LanguageToggle({ className, mode = "localize-path", currentLocale }: Props) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  const activeLocale = currentLocale ?? ((getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE) as Locale);
  const nextLocale: Locale = activeLocale === "ar" ? "en" : "ar";
  const label = nextLocale === "ar" ? "AR" : "EN";

  const targetHref = useMemo(() => {
    if (mode === "cookie-only") return stripLocaleFromPathname(pathname);
    const barePath = stripLocaleFromPathname(pathname);
    return localizePath(barePath, nextLocale);
  }, [pathname, nextLocale, mode]);

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
        if (mode === "cookie-only") {
          window.location.reload();
          return;
        }
        router.push(targetHref);
      }}
      aria-label={nextLocale === "ar" ? "Switch to Arabic" : "Switch to English"}
    >
      {label}
    </button>
  );
}
