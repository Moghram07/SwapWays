import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const nextConfig: NextConfig = {
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
