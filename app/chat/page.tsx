import { createConversation } from "@/app/chat/actions";
import { Button } from "@/components/ui/button";

/** Empty state shown at /chat: nothing open yet. */
export default function ChatIndexPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="text-lg font-medium">Start a new strategy</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Describe a trading strategy, or paste a TradingView compiler error to
        get it fixed.
      </p>
      <form action={createConversation} className="mt-6">
        <Button type="submit">New strategy</Button>
      </form>
    </main>
  );
}
