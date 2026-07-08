import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker runner image. Netlify's
  // Next.js runtime manages its own output, so skip standalone there.
  output: process.env.NETLIFY ? undefined : "standalone",
};

export default nextConfig;
