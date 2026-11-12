/**
 * Outgoing email, through Resend's HTTP API (resend.com) — no SDK, one
 * fetch. Needs RESEND_API_KEY. MAIL_FROM must be an address on a domain
 * verified in Resend; until one is, Resend's shared onboarding sender works
 * for testing.
 *
 * Without a key the message is printed to the server log instead (locally:
 * the terminal; on Vercel: the project's Logs), so nothing is lost before
 * email is set up.
 */
export type Mail = { to: string; subject: string; text: string; replyTo?: string };

export type SendResult = { ok: true; logged?: boolean } | { ok: false; error: string };

export async function sendMail(mail: Mail): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`\n── Email (not sent: RESEND_API_KEY unset) ──\nTo: ${mail.to}\nReply-To: ${mail.replyTo ?? "-"}\nSubject: ${mail.subject}\n\n${mail.text}\n────────────────────────────────────────────\n`);
    return { ok: true, logged: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM ?? "PineDev <onboarding@resend.dev>",
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
    }),
  });
  if (!res.ok) return { ok: false, error: `Resend responded ${res.status}: ${await res.text()}` };
  return { ok: true };
}
