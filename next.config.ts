import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const nextConfig: NextConfig = {
  /** pdf-parse loads pdf.js via dynamic `require` under `lib/pdf.js/...`; bundling breaks that. */
  serverExternalPackages: ["pdf-parse"],
  turbopack: {
    root: __dirname,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    // Without this, `next build` spawns one page-data worker per logical CPU core
    // (19 on this machine), which exhausts RAM and crashes with "JavaScript heap out
    // of memory". Cap the worker count; override with NEXT_BUILD_CPUS in CI if desired.
    cpus: Number(process.env.NEXT_BUILD_CPUS ?? 4),
  },
  async redirects() {
    return [{ source: "/4", destination: "/", permanent: true }];
  },
};

export default withBundleAnalyzer(nextConfig);
