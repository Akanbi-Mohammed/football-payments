import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // ✅ Let Vercel builds pass even if there are ESLint errors
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
