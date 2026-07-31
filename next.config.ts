import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cutover: root -> nowa Diagnostyka V2. 307 (tymczasowy, nie cache'owany) = odwracalny.
  // Stara v1 (app/page.tsx) zostaje w repo; usuniecie tego bloku przywraca stary root.
  async redirects() {
    return [
      { source: '/', destination: '/diagnoza', permanent: false },
    ];
  },
};

export default nextConfig;
