import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// `prepare: false` is required for Supabase's transaction-mode connection
// pooler (Supavisor), which this app is expected to run against on
// serverless platforms like Vercel.
const client = postgres(process.env.DATABASE_URL!, { prepare: false });

export const db = drizzle(client, { schema });

/**
 * Drizzle wraps driver errors in a DrizzleQueryError, with the underlying
 * Postgres error (and its SQLSTATE `code`, e.g. "23505" for a unique
 * violation) nested under `.cause`. This unwraps that chain so callers can
 * check the real code regardless of how deep the wrapping goes.
 */
export function getPostgresErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object") {
    if ("code" in error && typeof error.code === "string") {
      return error.code;
    }
    if ("cause" in error) {
      return getPostgresErrorCode((error as { cause?: unknown }).cause);
    }
  }
  return undefined;
}
