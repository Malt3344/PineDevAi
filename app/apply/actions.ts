"use server";

import { enquirySchema } from "@/lib/applications";
import { sendMail } from "@/lib/mail";

export type EnquiryResult = { ok: true } | { ok: false; error: string };

/** Where enquiries are delivered once email is set up. */
const ENQUIRIES_TO = process.env.APPLICATIONS_TO ?? "hello@pinedev.com";

/**
 * Takes an enquiry from the public page. Until RESEND_API_KEY is set, the
 * enquiry is written to the server log (Vercel → Logs) rather than
 * emailed; the visitor sees the same confirmation either way. `website`
 * is a honeypot that only form bots fill in.
 */
export async function submitEnquiry(formData: FormData): Promise<EnquiryResult> {
  if (String(formData.get("website") ?? "") !== "") return { ok: true };

  const parsed = enquirySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    organisation: formData.get("organisation") ?? undefined,
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const e = parsed.data;

  const result = await sendMail({
    to: ENQUIRIES_TO,
    replyTo: e.email,
    subject: `Enquiry: ${e.name}${e.organisation ? ` (${e.organisation})` : ""}`,
    text: [`Name: ${e.name}`, `Email: ${e.email}`, `Organisation: ${e.organisation ?? "—"}`, "", e.message].join("\n"),
  });
  if (!result.ok) console.error("Could not send enquiry email", result.error, e);
  // The visitor's part is done either way; a delivery problem is ours to fix.
  return { ok: true };
}
