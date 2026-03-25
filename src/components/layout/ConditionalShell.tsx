"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isLandingPage = path === "/4";
  const isDashboard = path?.startsWith("/dashboard");
  const showGlobalNav = !isLandingPage && !isDashboard;

  return (
    <div className="flex min-h-screen flex-col">
      {showGlobalNav && <Navbar />}
      <main className={`flex-1 ${showGlobalNav ? "pt-16" : ""}`}>{children}</main>
      <Footer />
    </div>
  );
}
