import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Le cache disque Turbopack (activé par défaut en Next 16.1+) se corrompt
    // régulièrement sous Windows : "Compaction failed / Unexpected end of JSON"
    // → le process `next dev` meurt et localhost renvoie ERR_CONNECTION_REFUSED.
    // Désactivé en local ; le cold start est un peu plus lent, le serveur reste stable.
    turbopackFileSystemCacheForDev: false,
  },
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
