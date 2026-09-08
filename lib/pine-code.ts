const CODE_BLOCK_RE = /```(?:pine|pinescript)?\r?\n([\s\S]*?)```/;

/**
 * A Pine script always opens with its version pragma. Free models fairly
 * often ignore the instruction to fence their code and just start typing
 * the script, which left the editor empty while the whole script sat in
 * the transcript as prose — the code was written, it just had nowhere to
 * go. This is the recovery for that.
 */
const BARE_SCRIPT_RE = /^[ \t]*\/\/@version\s*=\s*\d+/m;

/**
 * Extracts the first fenced code block's contents from a message, or null
 * if it has none. Shared between the server-side self-review pass and the
 * client-side "current script" panel — both need the exact same parsing.
 */
export function extractCodeBlock(text: string): string | null {
  const fenced = text.match(CODE_BLOCK_RE);
  if (fenced) return fenced[1];

  // No fence: if the reply contains a version pragma, treat everything from
  // it onwards as the script. Showing a little trailing prose in the editor
  // is a far smaller failure than showing nothing at all.
  const bare = text.match(BARE_SCRIPT_RE);
  if (bare?.index !== undefined) {
    const script = text.slice(bare.index).trimEnd();
    return script.length > 0 ? script : null;
  }

  return null;
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
