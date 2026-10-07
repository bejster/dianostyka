import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/rozjazd",
        destination: "/?door=th2&src=organic&campaign=th2_bio_v1",
      },
    ];
  },
};

export default nextConfig;
