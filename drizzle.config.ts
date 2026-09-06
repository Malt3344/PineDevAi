import { defineConfig } from "drizzle-kit";

// The Next.js app loads .env.local by itself, but drizzle-kit is a
// standalone CLI and does not — without this, every db:* script fails with
// "url: undefined". Optional on purpose: in CI and on Vercel the variable
// is already in the environment and there is no file to read.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local here; fall through to whatever is already set.
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local, or export it before running this script.",
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
