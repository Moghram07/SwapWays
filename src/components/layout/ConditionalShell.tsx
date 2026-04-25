"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const Navbar = dynamic(() => import("./Navbar").then((m) => ({ default: m.Navbar })));
const Footer = dynamic(() => import("./Footer").then((m) => ({ default: m.Footer })));

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isLandingPage = path === "/";
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
