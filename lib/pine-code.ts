const CODE_BLOCK_RE = /```(?:pine|pinescript)?\r?\n([\s\S]*?)```/;

/**
 * Extracts the first fenced code block's contents from a message, or null
 * if it has none. Shared between the server-side self-review pass and the
 * client-side "current script" panel — both need the exact same parsing.
 */
export function extractCodeBlock(text: string): string | null {
  const match = text.match(CODE_BLOCK_RE);
  return match ? match[1] : null;
}

/**
 * Extracts the most recent fenced code block across a conversation's
 * message texts (most recent last), for showing "the script we're
 * currently talking about" alongside the chat.
 */
export function extractLatestCodeBlock(texts: string[]): string | null {
  for (let i = texts.length - 1; i >= 0; i--) {
    const code = extractCodeBlock(texts[i]);
    if (code) return code;
  }
  return null;
}
