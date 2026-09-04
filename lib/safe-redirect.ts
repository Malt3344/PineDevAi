/**
 * Only a same-origin relative path is ever allowed as a post-login
 * destination. Without this, a crafted `?next=` value could be used as an
 * open redirect — sending a real, freshly-authenticated session through
 * this app straight to an attacker's site.
 */
export function safeNextPath(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/chat";
}
