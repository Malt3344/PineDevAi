import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

// The edge-safe config only (no DB adapter) — see auth.config.ts for why.
// Its `authorized` callback is what actually runs on every request; this is
// a UX convenience only, redirecting a signed-out visitor away from /chat.
// Every real page/route/action re-validates via lib/gate.ts's
// getApprovedUser(), which is never bypassed by this middleware.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image optimization
     * files, so the session cookie stays fresh across the app.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
