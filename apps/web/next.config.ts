import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@whipperbook/core",
    "@whipperbook/validation",
    "@whipperbook/api-client",
  ],
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
