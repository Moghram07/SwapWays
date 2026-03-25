import { LandingTopBar } from "@/components/landing/LandingTopBar";

export default function Layout4({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      <LandingTopBar variant="4" />
      <main>{children}</main>
    </div>
  );
}
