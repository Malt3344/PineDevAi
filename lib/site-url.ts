/**
 * Reads and validates this app's own public base URL from
 * NEXT_PUBLIC_SITE_URL. Used to build absolute URLs for things outside
 * Next.js's own routing — Stripe checkout/portal return URLs, auth email
 * redirects — which reject a malformed value outright. Failing here with
 * a clear message is much easier to debug than a cryptic "Not a valid
 * URL" surfacing from inside a third-party API call.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    return new URL(raw).toString().replace(/\/$/, "");
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL is not a valid absolute URL: "${raw}". It must include the scheme, e.g. "https://www.pine-dev.com".`,
    );
  }
}
