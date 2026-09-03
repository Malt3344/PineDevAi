const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Type-narrowing email format check. Intentionally permissive (no full
 * RFC 5322 validation) — the real verification of an address happens when
 * Supabase sends the magic link to it.
 */
export function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && EMAIL_REGEX.test(email.trim());
}
