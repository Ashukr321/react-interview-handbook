import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only for Docker: on Vercel, Next 16's adapter skips the trace file the standalone step needs.
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // A stale cached sw.js would pin users to an old deploy.
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] }];
  },
};

export default nextConfig;
