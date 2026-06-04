import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Silence multi-lockfile workspace-root inference warning
    root: __dirname,
  },
};

export default nextConfig;
