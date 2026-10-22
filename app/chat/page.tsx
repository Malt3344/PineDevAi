import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ArrowRight, FlaskConical, Plug, Plus } from "lucide-react";
import { createChat } from "@/app/chat/actions";
import { GradeBadge } from "@/components/study/primitives";
import { formatPct, formatRatio } from "@/components/study/format";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db/client";
import { chats, protocols } from "@/lib/db/schema";
import { getApprovedUser } from "@/lib/gate";
import { STAGES } from "@/lib/quant/protocol";
import type { Grade } from "@/lib/quant/analysis";

const STAGE_LABEL = Object.fromEntries(STAGES.map((s, i) => [s.id, `${i + 1} · ${s.label}`]));

const GRADE_ORDER: Grade[] = ["validated", "promising", "fragile", "rejected", "incomplete"];

/**
 * The research desk: every study and where it stands. Reads the summary
 * snapshot stored on each protocol row, so the list costs one query no
 * matter how many trades the studies hold.
 */
export default async function ResearchDeskPage() {
  const gate = await getApprovedUser();
  if (gate.status !== "approved") redirect("/login");

  const rows = await db
    .select({
      id: chats.id,
      title: chats.title,
      createdAt: chats.createdAt,
      summary: protocols.summary,
      lockedAt: protocols.lockedAt,
    })
    .from(chats)
    .leftJoin(protocols, eq(protocols.chatId, chats.id))
    .where(eq(chats.userId, gate.user.id))
    .orderBy(desc(chats.createdAt));

  const counts = Object.fromEntries(GRADE_ORDER.map((g) => [g, 0])) as Record<Grade, number>;
  for (const row of rows) counts[row.summary?.grade ?? "incomplete"]++;

  return (
    <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-lg font-medium">Research desk</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every idea you are testing, and how far through the protocol it has got.
            </p>
          </div>
          <form action={createChat}>
            <Button type="submit">
              <Plus />
              New study
            </Button>
          </form>
        </div>

        {rows.length === 0 ? (
          <div className="mt-8 rounded-xl border border-border bg-card p-6 sm:p-8">
            <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-muted/40">
              <FlaskConical className="size-5 text-primary" />
            </div>
            <h2 className="mt-4 text-base font-medium">Start your first study</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              A study takes one trading idea through seven stages — the same sequence a systematic
              fund uses before it risks capital. Most ideas fail somewhere along the way. That is
              the protocol working.
            </p>
            <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {STAGES.map((stage, i) => (
                <li key={stage.id} className="rounded-lg border border-border bg-background/40 p-3">
                  <span className="font-mono text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
                  <p className="mt-1 text-sm font-medium">{stage.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{stage.short}</p>
                </li>
              ))}
            </ol>
            <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="text-sm font-medium">The easiest way: let your own Claude run it</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect Claude (desktop, claude.ai or Claude Code) once, then just describe your idea.
                Claude interviews you, writes the Pine v6 strategy and takes it through every stage.
              </p>
              <Button className="mt-3" asChild>
                <Link href="/chat/connect">
                  <Plug />
                  Connect your Claude
                </Link>
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <form action={createChat}>
                <Button type="submit" variant="outline">
                  Start a study in the browser
                  <ArrowRight />
                </Button>
              </form>
              <Button variant="ghost" asChild>
                <Link href="/methodology">Read the methodology</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {GRADE_ORDER.map((grade) => (
                <div key={grade} className="rounded-lg border border-border bg-card px-3 py-2.5">
                  <GradeBadge grade={grade} />
                  <p className="mt-2 font-mono text-xl tabular-nums">{counts[grade]}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Study</TableHead>
                    <TableHead className="hidden md:table-cell">Stage</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">IS trades</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">IS PF</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">Deflated Sharpe</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">OOS efficiency</TableHead>
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
                          <Link href={`/chat/${row.id}`} className="block truncate font-medium after:absolute after:inset-0">
                            {row.title || "New study"}
                          </Link>
                          <span className="text-xs text-muted-foreground md:hidden">
                            {STAGE_LABEL[s?.stage ?? (row.lockedAt ? "build" : "hypothesis")]}
                          </span>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {STAGE_LABEL[s?.stage ?? (row.lockedAt ? "build" : "hypothesis")]}
                        </TableCell>
                        <TableCell className="hidden text-right font-mono tabular-nums sm:table-cell">
                          {s?.inSampleTrades ?? "—"}
                        </TableCell>
                        <TableCell className="hidden text-right font-mono tabular-nums sm:table-cell">
                          {s?.inSampleTrades ? formatRatio(s.inSampleProfitFactor) : "—"}
                        </TableCell>
                        <TableCell className="hidden text-right font-mono tabular-nums lg:table-cell">
                          {formatPct(s?.dsr)}
                        </TableCell>
                        <TableCell className="hidden text-right font-mono tabular-nums lg:table-cell">
                          {formatPct(s?.oosEfficiency, 0)}
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
          </>
        )}
      </div>
    </main>
  );
}
