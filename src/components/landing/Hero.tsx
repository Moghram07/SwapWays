"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative flex min-h-[90vh] items-center overflow-hidden bg-hero">
      {/* Decorative planes */}
      <motion.div
        className="absolute right-[15%] top-20 opacity-10"
        animate={{ x: [0, 30, 0], y: [0, -15, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <Plane className="h-32 w-32 rotate-[-30deg] text-white" />
      </motion.div>
      <motion.div
        className="absolute bottom-32 left-[10%] opacity-10"
        animate={{ x: [0, -20, 0], y: [0, 10, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      >
        <Plane className="h-20 w-20 rotate-[20deg] text-white" />
      </motion.div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+")`,
        }}
      />

      <div className="container relative z-10 mx-auto px-4 pt-24">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90">
              <Plane className="h-4 w-4" />
              Built for Airline Crew
            </span>
          </motion.div>

          <motion.h1
            className="mb-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            Swap Flights.{" "}
            <span className="opacity-80">Own Your Schedule.</span>
          </motion.h1>

          <motion.p
            className="mb-10 max-w-xl text-lg leading-relaxed text-white/70 sm:text-xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            The smart platform that lets airline crew members swap flights
            effortlessly — matching schedules, qualifications, and preferences
            in seconds.
          </motion.p>

          <motion.div
            className="flex flex-col gap-4 sm:flex-row"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
          >
            <Button variant="hero" size="lg" className="text-base px-8 py-6 rounded-lg" asChild>
              <Link href="/register">
                Start Swapping <ArrowRight className="ml-1 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="lg" className="text-base px-8 py-6 rounded-lg" asChild>
              <Link href="#how-it-works">See How It Works</Link>
            </Button>
          </motion.div>

          <motion.div
            className="mt-12 flex items-center gap-6 text-sm text-white/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-300" /> 2,500+ Active Crew
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-300" /> 15+ Airlines
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-300" /> 98% Match Rate
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
