"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { getTranslator } from "@/i18n/getTranslator";
import { type Locale } from "@/i18n/config";

/**
 * Icon-only light/dark toggle for the dashboard top bar.
 * Renders a stable initial state (Moon) until mounted to avoid hydration mismatch;
 * the no-flash script in the root layout handles the actual pre-paint theme.
 */
export function ThemeToggle({ locale, className }: { locale: Locale; className?: string }) {
  const t = getTranslator(locale);
  const { theme, toggleTheme, mounted } = useTheme();
  const isDark = mounted && theme === "dark";
  // Label/icon describe the action the click performs.
  const label = isDark ? t("dashboard.lightMode") : t("dashboard.darkMode");
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={
        className ??
        "inline-flex items-center justify-center rounded-lg border border-line p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-content"
      }
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
    </button>
  );
}
