import { createConversation } from "@/app/chat/actions";
import { AGENT_MODELS, DEFAULT_AGENT_MODEL_ID } from "@/lib/agent/models";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Empty state shown at /chat: no conversation selected yet. */
export default function ChatIndexPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="text-lg font-medium">Start a new conversation</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Describe a trading strategy, or paste a TradingView compiler error to
        get it fixed.
      </p>
      <form action={createConversation} className="mt-6 flex flex-col items-center gap-3">
        <Select name="model" defaultValue={DEFAULT_AGENT_MODEL_ID}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Choose a model" />
          </SelectTrigger>
          <SelectContent>
            {AGENT_MODELS.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex flex-col text-left">
                  <span>{model.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {model.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit">New chat</Button>
      </form>
    </main>
  );
}
