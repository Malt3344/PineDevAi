import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FlaskConical, FolderKanban, FileCode, Upload, ShieldCheck } from "lucide-react";
import { answerConsent } from "./actions";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/client";
import { getApprovedUser } from "@/lib/gate";
import { getClient } from "@/lib/oauth";

export const metadata: Metadata = { title: "Connect Claude — PineDev" };

type Params = Record<string, string | string[] | undefined>;

const PERMISSIONS = [
  { icon: FolderKanban, text: "Create studies and read their hypotheses, results and verdicts" },
  { icon: FileCode, text: "Save the Pine Script strategies it writes to your studies" },
  { icon: Upload, text: "Upload TradingView trade lists you give it" },
];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 sm:p-8">{children}</div>
    </main>
  );
}

/**
 * The OAuth consent screen: where "connect your Claude" becomes a single
 * click. Reached from Claude Code's /mcp login or claude.ai's connector
 * setup; sends the user through sign-in first if needed and back here.
 */
export default async function AuthorizePage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const param = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : "");
  const clientId = param("client_id");
  const redirectUri = param("redirect_uri");
  const codeChallenge = param("code_challenge");
  const state = param("state");

  const client = clientId ? await getClient(db, clientId) : null;
  const requestOk =
    client !== null &&
    param("response_type") === "code" &&
    param("code_challenge_method") === "S256" &&
    codeChallenge.length >= 43 &&
    client.redirectUris.includes(redirectUri);

  if (!requestOk) {
    return (
      <Shell>
        <h1 className="text-lg font-medium">This connection link is not valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Start the connection again from Claude. If it keeps happening, remove the PineDev
          connector in Claude and add it again.
        </p>
      </Shell>
    );
  }

  const gate = await getApprovedUser();
  if (gate.status === "unauthenticated") {
    const here = `/oauth/authorize?${new URLSearchParams(
      Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string"),
    ).toString()}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(here)}`);
  }
  if (gate.status === "unapproved") {
    return (
      <Shell>
        <h1 className="text-lg font-medium">This account is suspended</h1>
        <p className="mt-2 text-sm text-muted-foreground">It can&apos;t be connected to Claude.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FlaskConical className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-lg font-medium">Connect {client.name}</h1>
          <p className="truncate text-sm text-muted-foreground">to PineDev as {gate.user.email}</p>
        </div>
      </div>

      <p className="mt-6 text-sm">
        Your Claude will be able to run the validation protocol for you, using your own Claude
        plan. It will be allowed to:
      </p>
      <ul className="mt-3 space-y-2.5">
        {PERMISSIONS.map((p) => (
          <li key={p.text} className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <p.icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            {p.text}
          </li>
        ))}
      </ul>
      <p className="mt-4 flex items-start gap-2.5 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        It can&apos;t see your password, billing or account settings. Disconnect any time from
        Connect Claude in PineDev.
      </p>

      <form action={answerConsent} className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="redirect_uri" value={redirectUri} />
        <input type="hidden" name="code_challenge" value={codeChallenge} />
        <input type="hidden" name="state" value={state} />
        <Button type="submit" name="decision" value="deny" variant="outline">
          Cancel
        </Button>
        <Button type="submit" name="decision" value="allow">
          Allow
        </Button>
      </form>
    </Shell>
  );
}
