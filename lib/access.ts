/**
 * PineDev's research platform is internal: only the team holds accounts.
 * The allowlist comes from TEAM_EMAILS, a comma-separated list of
 * addresses and/or whole domains:
 *
 *   TEAM_EMAILS="malthe@example.com, @pine-dev.com"
 *
 * Closed by default — with TEAM_EMAILS unset, nobody gets in. Every door
 * checks this: registration, both sign-in providers, the request gate and
 * the MCP token check, so a stranger cannot reach the platform by any of
 * them, including Google sign-in.
 */
export function isTeamEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const address = email.trim().toLowerCase();
  const entries = (process.env.TEAM_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return entries.some((entry) =>
    entry.startsWith("@") ? address.endsWith(entry) : address === entry,
  );
}
