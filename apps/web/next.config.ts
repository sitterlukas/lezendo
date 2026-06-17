import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@whipperbook/core", "@whipperbook/validation"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
