import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    // Cloudflare Pages serves only the exported files. Do not imply that a
    // Next.js image-optimization server or its native Sharp runtime is present.
    unoptimized: true,
  },
};

export default nextConfig;
