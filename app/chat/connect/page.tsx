import { redirect } from "next/navigation";
import { CircleCheck, Monitor, Plug, Sparkles, Terminal } from "lucide-react";
import { disconnectAction } from "./actions";
import { CopyField } from "@/components/CopyField";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/components/study/format";
import { PLUGIN_MARKETPLACE_NAME, PLUGIN_MARKETPLACE_REPO, PLUGIN_NAME } from "@/lib/connect";
import { db } from "@/lib/db/client";
import { getApprovedUser } from "@/lib/gate";
import { listConnections, mcpResourceUrl } from "@/lib/oauth";

const TRY_PROMPTS = [
  "Use PineDev to validate an opening-range breakout on NQ futures, 5-minute chart.",
  "I have an RSI mean-reversion idea for BTCUSDT on the 1h — help me turn it into a PineDev study.",
  "Show me my PineDev studies and explain the verdict on the latest one.",
];

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border font-mono text-xs text-primary">
        {n}
      </span>
      <div className="min-w-0 flex-1 space-y-2 pt-0.5 text-sm">{children}</div>
    </li>
  );
}

/**
 * Connecting the user's own Claude. PineDev never asks for a Claude login
 * or key: the user adds PineDev to Claude, Claude sends them to PineDev's
 * consent screen once, and from then on runs the protocol on their own
 * Claude plan.
 */
export default async function ConnectPage() {
  const gate = await getApprovedUser();
  if (gate.status !== "approved") redirect("/login?callbackUrl=/chat/connect");

  const connections = await listConnections(db, gate.user.id);
  const url = mcpResourceUrl();

  return (
    <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-lg font-medium">Connect your Claude</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Use PineDev from inside your own Claude — the desktop app, claude.ai or Claude Code — on
            your own Claude plan. Claude gets PineDev&apos;s validation protocol and Pine v6 tools; your
            studies show up here as it works.
          </p>
        </div>

        {connections.length > 0 && (
          <section className="rounded-xl border border-primary/30 bg-primary/5">
            <header className="border-b border-primary/20 px-4 py-3">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <CircleCheck className="size-4 text-primary" aria-hidden />
                Connected
              </h2>
            </header>
            <ul className="divide-y divide-border">
              {connections.map((c) => (
                <li key={c.clientId} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Connected {formatDate(c.connectedAt.toISOString())}
                      {c.lastUsedAt && ` · last used ${formatDate(c.lastUsedAt.toISOString())}`}
                    </p>
                  </div>
                  <form action={disconnectAction}>
                    <input type="hidden" name="client_id" value={c.clientId} />
                    <Button type="submit" variant="outline" size="sm">
                      Disconnect
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-xl border border-border bg-card">
          <header className="flex items-start gap-3 border-b border-border px-4 py-3">
            <Monitor className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="text-sm font-medium">Claude desktop app or claude.ai</h2>
              <p className="text-xs text-muted-foreground">Easiest — no terminal. Needs a paid Claude plan (Pro or Max).</p>
            </div>
          </header>
          <ol className="space-y-4 p-4">
            <Step n={1}>
              <p>
                In Claude, open <span className="text-foreground">Settings → Connectors</span> and choose{" "}
                <span className="text-foreground">Add custom connector</span>.
              </p>
            </Step>
            <Step n={2}>
              <p>Name it PineDev and paste this URL:</p>
              <CopyField value={url} label="connector URL" />
            </Step>
            <Step n={3}>
              <p>
                Click <span className="text-foreground">Connect</span>. You&apos;ll land on PineDev — log in
                and press <span className="text-foreground">Allow</span>. That&apos;s it.
              </p>
            </Step>
          </ol>
        </section>

        <section className="rounded-xl border border-border bg-card">
          <header className="flex items-start gap-3 border-b border-border px-4 py-3">
            <Terminal className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="text-sm font-medium">Claude Code</h2>
              <p className="text-xs text-muted-foreground">
                Installs PineDev&apos;s skills too: Pine v6 strategy writing and the validation workflow.
              </p>
            </div>
          </header>
          <ol className="space-y-4 p-4">
            <Step n={1}>
              <p>In Claude Code, add the PineDev plugin marketplace:</p>
              <CopyField value={`/plugin marketplace add ${PLUGIN_MARKETPLACE_REPO}`} label="marketplace command" />
            </Step>
            <Step n={2}>
              <p>Install the plugin:</p>
              <CopyField value={`/plugin install ${PLUGIN_NAME}@${PLUGIN_MARKETPLACE_NAME}`} label="install command" />
            </Step>
            <Step n={3}>
              <p>
                Run <code className="font-mono text-foreground">/mcp</code>, pick{" "}
                <span className="text-foreground">pinedev</span> and log in. Your browser opens this site —
                press <span className="text-foreground">Allow</span>.
              </p>
            </Step>
          </ol>
          <div className="border-t border-border px-4 py-3">
            <p className="mb-2 text-xs text-muted-foreground">
              Only want the connection, without the skills? Run this in your terminal instead:
            </p>
            <CopyField value={`claude mcp add --transport http pinedev ${url}`} label="mcp add command" />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-primary" aria-hidden />
            Then just ask
          </h2>
          <ul className="mt-3 space-y-2">
            {TRY_PROMPTS.map((p) => (
              <li key={p}>
                <CopyField value={p} label="example prompt" />
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <Plug className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Claude interviews you for the hypothesis, writes the Pine v6 strategy, and tells you exactly
            which dates to backtest in TradingView. Drop the exported trade list into the chat and it
            uploads it and explains the result.
          </p>
        </section>
      </div>
    </main>
  );
}
