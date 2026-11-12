import type { NextConfig } from "next";

// Media base for every stored path (lib/media.ts). Explicit NEXT_PUBLIC_MEDIA_URL wins; otherwise built from the cloud name.
const cloud = process.env.CLOUDINARY_CLOUD_NAME;
const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL || (cloud ? `https://res.cloudinary.com/${cloud}/image/upload` : "");

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_MEDIA_URL: mediaUrl }, // inlined for server + browser
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "picsum.photos" }, // seed data only
    ],
  },
  async redirects() {
    return [{ source: "/", destination: "/en", permanent: false }];
  },
};

export default nextConfig;
