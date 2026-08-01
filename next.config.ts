import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output lets the Docker image run from a minimal node runtime
  // (only what the server needs is copied into .next/standalone).
  output: "standalone",
};

export default nextConfig;
