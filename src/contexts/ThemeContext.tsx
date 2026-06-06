"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

type ThemeContextValue = {
  theme: Theme;
  /** True once the client has read the persisted preference (avoids hydration-time UI flicker). */
  mounted: boolean;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Dark mode is scoped to the signed-in app; marketing/landing pages stay light. */
function isThemedRoute(pathname: string | null): boolean {
  return !!pathname && pathname.startsWith("/dashboard");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Dark is the default; only an explicit "light" choice opts out.
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  // Read the persisted preference after mount (never during render → no hydration mismatch).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "dark" || stored === "light") setThemeState(stored);
    } catch {
      /* localStorage unavailable — keep default dark */
    }
    setMounted(true);
  }, []);

  // Apply (or remove) `.dark` on <html> based on preference + current route.
  // Kept on <html> so body-level portals (dropdowns/modals) inherit the theme too.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark" && isThemedRoute(pathname)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme, pathname]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore persistence failure */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, mounted, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { theme: "light", mounted: false, toggleTheme: () => {}, setTheme: () => {} };
  }
  return ctx;
}
