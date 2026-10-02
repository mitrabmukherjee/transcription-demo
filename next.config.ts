import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Allow up to 510 MB request bodies (covers the 500 MB file + form overhead)
    proxyClientMaxBodySize: "510mb",
  },
};

export default nextConfig;
