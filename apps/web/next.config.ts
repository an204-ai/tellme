import type { NextConfig } from "next";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir:
    process.env.NEXT_DIST_DIR ||
    (process.env.NODE_ENV === "production" ? ".next-production" : ".next"),
  devIndicators: false,
  experimental: {
    ...(process.env.TELLME_LOW_MEMORY_BUILD === "1"
      ? { cpus: 1, webpackMemoryOptimizations: true }
      : {}),
    proxyTimeout: 180000,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_INTERNAL_URL || "http://127.0.0.1:4000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
