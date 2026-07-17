import type { NextConfig } from "next";

const isStatic = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(isStatic
    ? {
        output: "export" as const,
        basePath: "/selena",
        assetPrefix: "/selena",
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {
        serverExternalPackages: ["better-sqlite3"],
      }),
  allowedDevOrigins: ["localhost", "127.0.0.1"],
};

export default nextConfig;
