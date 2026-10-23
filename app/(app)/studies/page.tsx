import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ArrowRight, Plug } from "lucide-react";
import { CopyField } from "@/components/CopyField";
import { GradeBadge } from "@/components/study/primitives";
import { formatDate, formatPct, formatRatio } from "@/components/study/format";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db/client";
import { chats, protocols } from "@/lib/db/schema";
import { getApprovedUser } from "@/lib/gate";
import { listConnections } from "@/lib/oauth";
import { STAGES } from "@/lib/quant/protocol";

const STAGE_LABEL = Object.fromEntries(STAGES.map((s, i) => [s.id, `${i + 1}/7 · ${s.label}`]));

const FIRST_PROMPT = "Use PineDev to validate my trading strategy idea.";

/**
 * Every study, newest first. Studies are started from the user's own
 * Claude, so until there is a connection the page is a single, clear next
 * step instead of an empty table.
 */
export default async function StudiesPage() {
  const gate = await getApprovedUser();
  if (gate.status !== "approved") redirect("/login");

  const [rows, connections] = await Promise.all([
    db
      .select({
        id: chats.id,
        title: chats.title,
        createdAt: chats.createdAt,
        summary: protocols.summary,
      })
      .from(chats)
      .leftJoin(protocols, eq(protocols.chatId, chats.id))
      .where(eq(chats.userId, gate.user.id))
      .orderBy(desc(chats.createdAt)),
    listConnections(db, gate.user.id),
  ]);

  const connected = connections.length > 0;

  if (rows.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-10">
        <div className="w-full max-w-lg text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <Plug className="size-5 text-primary" />
          </div>
          {connected ? (
            <>
              <h1 className="mt-5 text-xl font-semibold tracking-tight">Your Claude is connected</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Open Claude and ask it to validate a strategy. The study appears here as it works.
              </p>
              <div className="mt-6 text-left">
                <CopyField value={FIRST_PROMPT} label="first prompt" />
              </div>
            </>
          ) : (
            <>
              <h1 className="mt-5 text-xl font-semibold tracking-tight">Connect your Claude to start</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                PineDev runs inside your own Claude. Connect it once — it takes a minute — then describe
                your strategy idea and Claude takes it through the full quant validation.
              </p>
              <Button className="mt-6" size="lg" asChild>
                <Link href="/connect">
                  Connect Claude
                  <ArrowRight />
                </Link>
              </Button>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-lg font-medium">Studies</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Start a new one by asking your Claude to validate a strategy.
            </p>
          </div>
          {!connected && (
            <Button asChild>
              <Link href="/connect">
                <Plug />
                Connect Claude
              </Link>
            </Button>
          )}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Strategy</TableHead>
                <TableHead className="hidden sm:table-cell">Progress</TableHead>
                <TableHead className="hidden text-right md:table-cell">Profit factor</TableHead>
                <TableHead className="hidden text-right md:table-cell">Deflated Sharpe</TableHead>
                <TableHead className="pr-4 text-right">Verdict</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const s = row.summary;
                return (
                  <TableRow key={row.id} className="relative">
                    <TableCell className="max-w-64 pl-4">
                      {/* The whole row is the link target; the title carries the name. */}
                      <Link href={`/studies/${row.id}`} className="block truncate font-medium after:absolute after:inset-0">
                        {row.title || "New study"}
                      </Link>
                      <span className="text-xs text-muted-foreground">{formatDate(row.createdAt.toISOString())}</span>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {STAGE_LABEL[s?.stage ?? "hypothesis"]}
                    </TableCell>
                    <TableCell className="hidden text-right font-mono tabular-nums md:table-cell">
                      {s?.inSampleTrades ? formatRatio(s.inSampleProfitFactor) : "—"}
                    </TableCell>
                    <TableCell className="hidden text-right font-mono tabular-nums md:table-cell">
                      {formatPct(s?.dsr)}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <GradeBadge grade={s?.grade ?? "incomplete"} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </main>
  );
}
