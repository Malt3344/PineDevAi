import { NextResponse } from "next/server";
import { isValidEmail } from "@/lib/email";
import { db, getPostgresErrorCode } from "@/lib/db/client";
import { waitlist } from "@/lib/db/schema";

const UNIQUE_VIOLATION = "23505";

/**
 * Adds an email to the public waitlist. Validates the format, treats a
 * duplicate signup as a success (not an error), and never exposes
 * database details to the client.
 */
export async function POST(req: Request) {
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : body.email;

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  try {
    await db.insert(waitlist).values({ email: email.toLowerCase() });
  } catch (error) {
    const code = getPostgresErrorCode(error);

    if (code === UNIQUE_VIOLATION) {
      return NextResponse.json(
        { message: "You are already on the list." },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { message: "You are on the waitlist." },
    { status: 201 },
  );
}
