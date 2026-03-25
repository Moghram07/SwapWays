import { LandingTopBar } from "@/components/landing/LandingTopBar";
import { LandingContentV4 } from "@/components/landing/LandingContentV4";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      <LandingTopBar variant="4" />
      <main>
        <LandingContentV4 />
      </main>
    </div>
  );
}
