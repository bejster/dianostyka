import type { NextConfig } from "next";

// Tylko strony publiczne: stare POST /api/* musza pozostac dostepne dla starszych integracji CRM.
const legacyHost = [{ type: 'host' as const, value: 'diagnostyka.talerzihantle.com' }];

const nextConfig: NextConfig = {
  async redirects() {
    return ['/', '/diagnoza', '/rozjazd', '/w'].map((path) => ({
      source: path,
      has: legacyHost,
      destination: `https://168.talerzihantle.com${path}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
