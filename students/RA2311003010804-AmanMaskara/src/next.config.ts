import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  output: "standalone",
  // Nonce-based CSP needs per-request rendering; PPR (Cache Components) is incompatible with nonces.
  cacheComponents: false,
  reactCompiler: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withSerwist(withIntl(nextConfig));
