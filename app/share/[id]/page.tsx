import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Message, MessageContent as MessageBubble } from "@/components/ai-elements/message";
import { MessageContent } from "@/components/MessageContent";
import { Badge } from "@/components/ui/badge";
import { VerdictReport } from "@/components/study/stages";
import { formatDate } from "@/components/study/format";
import { loadStudy } from "@/lib/studies";
import { db } from "@/lib/db/client";
import { chats, messages } from "@/lib/db/schema";

/** Concatenates a stored message's text parts into plain text. */
function partsText(parts: unknown[]): string {
  return parts
    .filter(
      (part): part is { type: "text"; text: string } =>
        !!part &&
        typeof part === "object" &&
        (part as { type?: unknown }).type === "text" &&
        typeof (part as { text?: unknown }).text === "string",
    )
    .map((part) => part.text)
    .join("\n");
}

/**
 * A public, read-only view of one chat. No auth check — that is the whole
 * point of "shared" — but every row is still scoped to `visibility =
 * "public"`, so flipping a chat back to private immediately 404s this page
 * for anyone still holding the link.
 */
export default async function SharedChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [chat] = await db
    .select({ id: chats.id, title: chats.title, visibility: chats.visibility, userId: chats.userId })
    .from(chats)
    .where(and(eq(chats.id, id), eq(chats.visibility, "public")));

  if (!chat) {
    notFound();
  }

  const [rows, study] = await Promise.all([
    db
      .select({ id: messages.id, role: messages.role, parts: messages.parts })
      .from(messages)
      .where(eq(messages.chatId, id))
      .orderBy(asc(messages.createdAt)),
    loadStudy(db, id, chat.userId),
  ]);
  const h = study.protocol.hypothesis;

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-8 sm:px-8">
      <header className="mb-6 flex items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-lg font-semibold">{chat.title || "Untitled study"}</h1>
          <Badge variant="secondary">Shared, read-only</Badge>
        </div>
        <Link href="/" className="shrink-0 text-sm font-medium text-muted-foreground hover:text-foreground">
          PineDev
        </Link>
      </header>

      {/* The tear sheet: what was claimed, and how it held up. */}
      <section className="mb-10 space-y-5">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">
            {h.market || "Market not set"} · {h.timeframe || "timeframe not set"} ·{" "}
            {study.protocol.lockedAt ? `pre-registered ${formatDate(study.protocol.lockedAt)}` : "not pre-registered"}
          </p>
          {h.rationale && <p className="mt-2 text-sm leading-relaxed">{h.rationale}</p>}
          {(h.entryRules || h.exitRules) && (
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Entry</dt>
                <dd className="mt-0.5">{h.entryRules || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Exit</dt>
                <dd className="mt-0.5">{h.exitRules || "—"}</dd>
              </div>
            </dl>
          )}
        </div>
        <VerdictReport analysis={study.analysis} />
      </section>

      {rows.length > 0 && <h2 className="mb-6 text-sm font-medium text-muted-foreground">Research conversation</h2>}
      <div className="flex flex-1 flex-col gap-7">
        {rows.map((row) => (
          <Message from={row.role} key={row.id}>
            {row.role === "user" ? (
              <MessageBubble>{partsText(row.parts as unknown[])}</MessageBubble>
            ) : (
              <div className="min-w-0 max-w-full text-sm">
                <MessageContent content={partsText(row.parts as unknown[])} />
              </div>
            )}
          </Message>
        ))}
      </div>

      <footer className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
        Validate your own strategy the same way.{" "}
        <Link href="/login?mode=sign-up" className="font-medium text-foreground hover:underline">
          Get started with PineDev
        </Link>
      </footer>
    </main>
  );
}
