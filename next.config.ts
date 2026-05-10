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
  },
  async redirects() {
    return [{ source: "/4", destination: "/", permanent: true }];
  },
};

export default withBundleAnalyzer(nextConfig);
