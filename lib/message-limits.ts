/**
 * Maximum length (in characters) of a single user message. Pasted compiler
 * errors and full scripts can be long, so this is generous, but it still
 * guards against pathological input.
 */
export const MAX_MESSAGE_LENGTH = 12000;

/** Whether a message exceeds MAX_MESSAGE_LENGTH and should be rejected. */
export function isMessageTooLong(content: string): boolean {
  return content.length > MAX_MESSAGE_LENGTH;
}
