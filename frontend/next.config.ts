import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  // Turbopack root: monorepo root where deps are hoisted (contains package.json + lockfile)
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  // Monorepo: trace files from the repo root so shared deps are bundled.
  outputFileTracingRoot: path.resolve(__dirname, ".."),
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
