/**
 * Only a same-origin relative path is ever allowed as a post-login
 * destination. Without this, a crafted `?callbackUrl=` value could be used
 * as an open redirect — sending a freshly-authenticated session straight
 * to an attacker's site. "//host" and "/\host" both leave the origin in a
 * browser, so both are refused.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) {
    return next;
  }
  return "/chat";
}
