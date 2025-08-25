import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // ✅ skip cssnano; avoids the crash
    optimizeCss: false,
  },
  webpack(config) {
    // Extra belt-and-braces: disable all minimizers if needed
    if (process.env.DISABLE_MINIFY === "1") {
      config.optimization.minimize = false;
    }
    return config;
  },
};

export default nextConfig;
