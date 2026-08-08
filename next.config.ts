import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const hstsHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Standalone output lets the Docker image run from a minimal node runtime
  // (only what the server needs is copied into .next/standalone).
  output: "standalone",
  // Don't advertise the Next.js version in Server headers.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // Only claim HSTS when the request actually arrived over HTTPS
      // (Cloudflare / VPS behind TLS); plain local Docker stays on HTTP.
      {
        source: "/(.*)",
        has: [{ type: "header", key: "x-forwarded-proto", value: "https" }],
        headers: hstsHeaders,
      },
    ];
  },
};

export default nextConfig;
