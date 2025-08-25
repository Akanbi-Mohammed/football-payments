import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    optimizeCss: false, // turn off Next’s css optimizer
  },
  webpack(config, { dev }) {
    if (!dev) {
      // Always disable cssnano/terser in prod
      config.optimization.minimize = false;
      if (Array.isArray(config.optimization.minimizer)) {
        config.optimization.minimizer = []; // wipe all minimizers
      }
    }
    return config;
  },
  swcMinify: false, // also disable JS minifier while debugging
};

export default nextConfig;
