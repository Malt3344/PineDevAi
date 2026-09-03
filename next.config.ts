import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root explicitly so Next.js doesn't get confused by
  // an unrelated lockfile that happens to live in a parent directory.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
