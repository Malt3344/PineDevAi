import { z } from "zod";

/** An enquiry from the public page. Deliberately short. */
export const enquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address.").max(200),
  organisation: z.string().trim().max(160).optional().transform((v) => v || null),
  message: z.string().trim().min(10, "Tell us briefly what you have in mind.").max(3000),
});

export type Enquiry = z.output<typeof enquirySchema>;
