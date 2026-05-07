"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { isLocale } from "@/i18n/config";

const Navbar = dynamic(() => import("./Navbar").then((m) => ({ default: m.Navbar })));
const Footer = dynamic(() => import("./Footer").then((m) => ({ default: m.Footer })));

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const firstSegment = path?.split("/").filter(Boolean)[0];
  const isLocalizedLanding = firstSegment ? isLocale(firstSegment) && path.split("/").filter(Boolean).length === 1 : false;
  const isLandingPage = path === "/" || isLocalizedLanding;
  const isDashboard = path?.startsWith("/dashboard");
  const showGlobalNav = !isLandingPage && !isDashboard;
  const showFooter = isLandingPage;

  return (
    <div className="flex min-h-screen flex-col">
      {showGlobalNav && <Navbar />}
      <main className={`flex-1 ${showGlobalNav ? "pt-16" : ""}`}>{children}</main>
      {showFooter && <Footer />}
    </div>
  );
}
