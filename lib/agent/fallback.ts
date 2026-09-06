/**
 * Runs `attempt` against each model id in turn and returns the first
 * success. Providers go down, rate limit, and time out; the user should
 * see a slightly different model answer, not a crashed chat.
 *
 * Every failure before the last is swallowed deliberately — if all of them
 * fail, the last error is thrown so the caller still reports a real cause
 * rather than a synthetic "everything failed" message. `onFallback` exists
 * so the caller can log which model actually served the request.
 */
export async function withModelFallback<T>(
  modelIds: string[],
  attempt: (modelId: string) => Promise<T>,
  onFallback?: (failedModelId: string, error: unknown) => void,
): Promise<T> {
  if (modelIds.length === 0) {
    throw new Error("withModelFallback requires at least one model id.");
  }

  let lastError: unknown;

  for (const [index, modelId] of modelIds.entries()) {
    try {
      return await attempt(modelId);
    } catch (error) {
      lastError = error;
      const isLast = index === modelIds.length - 1;
      if (isLast) break;
      onFallback?.(modelId, error);
    }
  }

  throw lastError;
}

/**
 * The models to try, in order: the one the conversation asked for, then
 * the configured fallback. Deduplicated, because a conversation already
 * pinned to the fallback model should not retry it against itself.
 */
export function modelChain(primaryId: string, fallbackId: string): string[] {
  return primaryId === fallbackId ? [primaryId] : [primaryId, fallbackId];
}
