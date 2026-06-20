import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@whipperbook/core",
    "@whipperbook/validation",
    "@whipperbook/api-client",
    "@whipperbook/db",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        // Demo feed seed uses pravatar placeholder avatars.
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
    ],
  },
};

export default nextConfig;
