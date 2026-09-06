import { generateText } from "ai";
import { extractCodeBlock } from "@/lib/pine-code";
import { languageModelFor } from "./provider";

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

export type ReviewResult = {
  text: string;
  inputTokens: number | undefined;
  outputTokens: number | undefined;
};

/**
 * Runs one real review pass over a draft reply's Pine Script, using a
 * second model call to check it against known Pine v6 pitfalls and either
 * confirm it or return a corrected version. Replies with no code (e.g. a
 * conceptual answer) pass through untouched — there is nothing to review,
 * and the call is skipped rather than paid for.
 *
 * The reviewing model is chosen by reviewModelIdFor(), not by the caller's
 * model: a cheap draft still gets reviewed by a strong model, which is
 * where most of the quality of the final script comes from.
 */
export async function selfReviewAndCorrect(
  reviewModelId: string,
  draftText: string,
): Promise<ReviewResult> {
  const original = extractCodeBlock(draftText);
  if (!original) {
    return { text: draftText, inputTokens: undefined, outputTokens: undefined };
  }

  const { text: verdict, usage } = await generateText({
    model: languageModelFor(reviewModelId),
    system: REVIEW_SYSTEM_PROMPT,
    prompt: `Review this Pine Script v6 code:\n\n${original}`,
  });

  const trimmedVerdict = verdict.trim();
  const text =
    trimmedVerdict === "OK"
      ? draftText
      : draftText.replace(
          original,
          (extractCodeBlock(trimmedVerdict) ?? trimmedVerdict).trim(),
        );

  return { text, inputTokens: usage?.inputTokens, outputTokens: usage?.outputTokens };
}
