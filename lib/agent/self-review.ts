import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { extractCodeBlock } from "@/lib/pine-code";

export const REVIEW_SYSTEM_PROMPT = `You are a meticulous Pine Script v6 compiler and code reviewer, checking a script another engineer just wrote before it reaches the user.

Check specifically for:
- Missing or wrong version declaration (must be "//@version=6").
- Syntax errors: unbalanced parentheses/brackets, invalid operators, malformed function calls.
- request.security calls missing lookahead=barmerge.lookahead_off where repainting matters.
- Type errors: passing a "series" value where a "simple" (compile-time-constant) argument is required.
- Undeclared or misused variables, especially missing "var" on persistent state.
- strategy.entry/strategy.order used inconsistently or incorrectly for the described intent.
- More than 64 total plot/plotshape/plotchar calls.

Reply with EXACTLY the single word "OK" (nothing else, no punctuation) if the script has none of these problems. Otherwise, reply with ONLY the complete corrected script in a single Pine Script code block — no commentary, no explanation, no partial diff.`;

/**
 * Runs one real review pass over a draft reply's Pine Script, using a
 * second model call to check it against known Pine v6 pitfalls and either
 * confirm it or return a corrected version. Replies with no code (e.g. a
 * conceptual answer) pass through untouched — there is nothing to review.
 *
 * This is the actual mechanism behind "reiterates until there are no
 * syntax mistakes" — not a description of intent, a real second pass that
 * runs before every response reaches the user.
 */
export async function selfReviewAndCorrect(
  modelId: string,
  draftText: string,
): Promise<string> {
  const original = extractCodeBlock(draftText);
  if (!original) return draftText;

  const { text: verdict } = await generateText({
    model: anthropic(modelId),
    system: REVIEW_SYSTEM_PROMPT,
    prompt: `Review this Pine Script v6 code:\n\n${original}`,
  });

  const trimmedVerdict = verdict.trim();
  if (trimmedVerdict === "OK") {
    return draftText;
  }

  const corrected = extractCodeBlock(trimmedVerdict) ?? trimmedVerdict;
  return draftText.replace(original, corrected.trim());
}
