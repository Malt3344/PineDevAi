import type { NextAuthConfig } from "next-auth";

/**
 * The edge-safe half of the Auth.js config — used by middleware.ts, which
 * runs in the Edge runtime and must not touch the database (no adapter, no
 * providers with server-side logic). Real providers and the Drizzle adapter
 * live in auth.ts, used everywhere else (route handlers, server actions,
 * server components).
 *
 * The `authorized` callback is what middleware actually enforces, and it is
 * a UX convenience only: it redirects a signed-out visitor away from /chat
 * so they don't see a broken page, but every real page/route/action
 * independently re-validates via lib/gate.ts's getApprovedUser(), which also
 * checks the isApproved flag that this callback deliberately does not.
 */
export const authConfig = {
  // Auth.js refuses to trust the incoming Host header in production unless
  // told to (protects self-hosted deployments from Host-header injection).
  // This app's own trust boundary is NEXT_PUBLIC_SITE_URL — every absolute
  // URL it builds itself (Stripe return URLs, etc.) already comes from
  // there, not from a request header — and it runs behind Vercel, which
  // terminates TLS and sets a reliable Host itself. Without this, every
  // request in production (anything with NODE_ENV=production, including
  // `next start` locally) fails session lookups with an UntrustedHost error.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isOnChat = request.nextUrl.pathname.startsWith("/chat");
      if (!isOnChat) return true;
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
