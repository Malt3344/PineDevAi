import { createConversation } from "@/app/chat/actions";
import { AGENT_MODELS, DEFAULT_AGENT_MODEL_ID } from "@/lib/agent/models";

/** Empty state shown at /chat: no conversation selected yet. */
export default function ChatIndexPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="text-lg font-medium">Start a new conversation</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Describe a trading strategy, or paste a TradingView compiler error to
        get it fixed.
      </p>
      <form action={createConversation} className="mt-6 flex flex-col items-center gap-3">
        <select
          name="model"
          defaultValue={DEFAULT_AGENT_MODEL_ID}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
        >
          {AGENT_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label} — {model.description}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90"
        >
          New chat
        </button>
      </form>
    </main>
  );
}
