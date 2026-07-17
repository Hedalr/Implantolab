import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Contourne un bug NFT/@swc/helpers sur les lambdas Node Vercel (Next 16.2.x)
  // qui peut provoquer MIDDLEWARE_INVOCATION_FAILED.
  outputFileTracingIncludes: {
    "*": ["./node_modules/@swc/helpers/esm/**"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.notion.so" },
      { protocol: "https", hostname: "*.amazonaws.com" },
      {
        protocol: "https",
        hostname: "prod-files-secure.s3.us-west-2.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
