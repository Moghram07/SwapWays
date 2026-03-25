"use client";

import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { CTA } from "./CTA";

export function LandingContentV4() {
  return (
    <>
      <Hero />

      <HowItWorks />

      {/* Features - nav anchor */}
      <section id="features" className="scroll-mt-20 border-t border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Features</h2>
          <p className="mt-3 text-slate-600">
            Crew-only verification, instant matching, and secure swaps.
          </p>
        </div>
      </section>

      <CTA />
    </>
  );
}
