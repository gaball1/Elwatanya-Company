import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: http: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://nominatim.openstreetmap.org",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
];

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
  async headers() {
    const headers: { source: string; headers: { key: string; value: string }[] }[] = [];

    if (process.env.NODE_ENV === "production") {
      headers.push({ source: "/:path*", headers: securityHeaders });
    }

    headers.push({
      source: "/(ar|en)/:path*",
      headers: [
        { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
        { key: "Pragma", value: "no-cache" },
        { key: "Expires", value: "0" },
      ],
    });

    return headers;
  },
  async rewrites() {
    // BACKEND_API_URL (server-only) targets the internal backend; falls back to
    // the browser-facing value for local dev where they are the same host.
    const backendUrl =
      process.env.BACKEND_API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:3001/api/v1";
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
