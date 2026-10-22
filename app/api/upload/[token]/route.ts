import { corsJson, corsPreflight } from "@/lib/cors";
import { db } from "@/lib/db/client";
import { formatStudy } from "@/lib/mcp/format";
import { claimUploadToken } from "@/lib/oauth";
import { parseTradeList } from "@/lib/quant/trades";
import { getSiteUrl } from "@/lib/site-url";
import { loadStudy } from "@/lib/studies";
import { listStudies, recordRun } from "@/lib/study-ops";

export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Receives a trade-list CSV through a one-time link from get_upload_url —
 * how Claude Code sends a file with curl instead of pasting it into the
 * conversation. The link itself is the credential, for one study and one
 * stage, once.
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) return corsJson({ error: "File is larger than 4 MB." }, { status: 413 });

  const claim = await claimUploadToken(db, token);
  if (!claim) {
    return corsJson({ error: "This upload link is invalid, expired or already used. Ask for a new one." }, { status: 404 });
  }

  const csv = await req.text();
  if (csv.length > MAX_BYTES) return corsJson({ error: "File is larger than 4 MB." }, { status: 413 });
  const parsed = parseTradeList(csv);
  if (!parsed.ok) return corsJson({ error: parsed.error }, { status: 400 });

  const result = await recordRun(db, claim.userId, claim.chatId, {
    stage: claim.stage,
    fileName: null,
    trades: parsed.trades,
  });
  if (!result.ok) return corsJson({ error: result.error }, { status: 400 });

  const { protocol, analysis } = await loadStudy(db, claim.chatId, claim.userId);
  const title = (await listStudies(db, claim.userId)).find((s) => s.id === claim.chatId)?.title ?? "Study";
  const report = formatStudy(
    { id: claim.chatId, title, url: `${getSiteUrl()}/chat/${claim.chatId}` },
    protocol,
    analysis,
    "full",
  );
  return corsJson({ ok: true, recorded: result.label, trades: parsed.trades.length, report });
}

export const OPTIONS = corsPreflight;
