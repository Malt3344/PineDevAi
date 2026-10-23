import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root explicitly so Next.js doesn't get confused by
  // an unrelated lockfile that happens to live in a parent directory.
  outputFileTracingRoot: path.join(__dirname),
  // The app used to live under /chat; old bookmarks and Stripe return URLs
  // land in the right place instead of a 404.
  async redirects() {
    return [
      { source: "/chat", destination: "/studies", permanent: true },
      { source: "/chat/connect", destination: "/connect", permanent: true },
      { source: "/chat/account/:path*", destination: "/account/:path*", permanent: true },
      { source: "/chat/strategies", destination: "/studies", permanent: true },
      { source: "/chat/:id", destination: "/studies/:id", permanent: true },
      { source: "/pricing", destination: "/#pricing", permanent: true },
      { source: "/share/:id", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
