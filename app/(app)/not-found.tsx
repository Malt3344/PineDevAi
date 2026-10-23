import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * 404 scoped to /chat — renders inside the chat layout (sidebar still
 * visible), for cases like an old or deleted conversation link, so the
 * user is never dropped outside the app shell.
 */
export default function ChatNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-lg font-medium">Conversation not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This conversation doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Button className="mt-6" asChild>
<Link href="/chat">Start a new chat</Link>
</Button>
    </main>
  );
}
