import { z } from "zod";
import type { db as Db } from "@/lib/db/client";
import { PINE_V6_API } from "@/lib/agent/pine-reference";
import { createUploadToken } from "@/lib/oauth";
import { lintPineScript } from "@/lib/quant/pine-lint";
import { RUN_STAGES, type Criteria, type Hypothesis } from "@/lib/quant/protocol";
import { parseTradeList } from "@/lib/quant/trades";
import { loadStudy } from "@/lib/studies";
import {
  attachScript,
  createStudy,
  listStudies,
  lockStudy,
  ownsStudy,
  recordRun,
  saveHypothesisDraft,
} from "@/lib/study-ops";
import { formatStudy } from "./format";

/**
 * The tools a connected Claude can call. Each one is a thin wrapper over
 * lib/study-ops.ts or lib/quant — the same code the website runs — so a
 * study driven from Claude and one driven from the browser are the same
 * study, visible in both places.
 *
 * Arguments arrive as untrusted JSON and are parsed with zod before
 * anything touches the database. Failures come back as tool errors
 * (isError) the model can read and recover from, not as protocol errors.
 */

export type ToolContext = { db: typeof Db; userId: string; siteUrl: string };

export type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint?: boolean };
  run: (args: unknown, ctx: ToolContext) => Promise<ToolResult>;
};

const text = (t: string, structuredContent?: Record<string, unknown>): ToolResult => ({
  content: [{ type: "text", text: t }],
  ...(structuredContent ? { structuredContent } : {}),
});
const fail = (t: string): ToolResult => ({ content: [{ type: "text", text: t }], isError: true });

const studyUrl = (ctx: ToolContext, id: string) => `${ctx.siteUrl}/chat/${id}`;

const STUDY_ID = { type: "string", description: "The study's id (from list_studies or create_study)." };

async function studyText(ctx: ToolContext, studyId: string, detail: "summary" | "full") {
  const { protocol, analysis } = await loadStudy(ctx.db, studyId, ctx.userId);
  const [row] = (await listStudies(ctx.db, ctx.userId)).filter((s) => s.id === studyId);
  return formatStudy({ id: studyId, title: row?.title ?? "Study", url: studyUrl(ctx, studyId) }, protocol, analysis, detail);
}

async function requireStudy(ctx: ToolContext, studyId: unknown): Promise<string | null> {
  return typeof studyId === "string" && (await ownsStudy(ctx.db, ctx.userId, studyId)) ? studyId : null;
}

const hypothesisArgs = z.object({
  study_id: z.string(),
  market: z.string().max(120).optional(),
  timeframe: z.string().max(60).optional(),
  rationale: z.string().max(4000).optional(),
  entry_rules: z.string().max(4000).optional(),
  exit_rules: z.string().max(4000).optional(),
  in_sample_start: z.string().optional(),
  in_sample_end: z.string().optional(),
  out_of_sample_start: z.string().optional(),
  out_of_sample_end: z.string().optional(),
  account_size: z.number().optional(),
  cost_bps: z.number().optional(),
  prior_trials: z.number().int().optional(),
  criteria: z
    .object({
      min_trades: z.number().int().optional(),
      min_profit_factor: z.number().optional(),
      min_deflated_sharpe: z.number().optional(),
      max_drawdown_pct: z.number().optional(),
      min_profitable_periods_pct: z.number().optional(),
      min_oos_efficiency: z.number().optional(),
      min_oos_profit_factor: z.number().optional(),
    })
    .optional(),
});

const DATE = { type: "string", description: "YYYY-MM-DD" };

export const TOOLS: Tool[] = [
  {
    name: "list_studies",
    title: "List studies",
    description: "List the user's PineDev studies with their protocol stage and verdict.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    async run(_args, ctx) {
      const rows = await listStudies(ctx.db, ctx.userId);
      if (rows.length === 0) return text("No studies yet. Create one with create_study.", { studies: [] });
      const studies = rows.map((r) => ({
        id: r.id,
        title: r.title,
        stage: r.summary?.stage ?? "hypothesis",
        verdict: r.summary?.grade ?? "incomplete",
        url: studyUrl(ctx, r.id),
      }));
      return text(
        studies.map((s) => `- ${s.title} — stage ${s.stage}, verdict ${s.verdict} (study_id ${s.id})`).join("\n"),
        { studies },
      );
    },
  },
  {
    name: "create_study",
    title: "Create study",
    description:
      "Start a new study: one trading idea taken through the validation protocol. Returns its id and a link the user can open in PineDev.",
    inputSchema: {
      type: "object",
      properties: { title: { type: "string", description: "Short name, e.g. 'NQ opening-range breakout'." } },
      additionalProperties: false,
    },
    annotations: {},
    async run(args, ctx) {
      const parsed = z.object({ title: z.string().max(200).optional() }).safeParse(args ?? {});
      const row = await createStudy(ctx.db, ctx.userId, parsed.success ? parsed.data.title : undefined);
      return text(
        `Created "${row.title}" (study_id ${row.id}). Open it in PineDev: ${studyUrl(ctx, row.id)}\nNext: work out the hypothesis with the user and save it with set_hypothesis.`,
        { study_id: row.id, url: studyUrl(ctx, row.id) },
      );
    },
  },
  {
    name: "get_study",
    title: "Get study",
    description:
      "Everything about one study: hypothesis, pass criteria, current stage, every statistic and check computed so far, the verdict, and the next step. Call this before advising the user on a study.",
    inputSchema: {
      type: "object",
      properties: { study_id: STUDY_ID },
      required: ["study_id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    async run(args, ctx) {
      const id = await requireStudy(ctx, (args as { study_id?: unknown })?.study_id);
      if (!id) return fail("Study not found. Use list_studies to find the right study_id.");
      return text(await studyText(ctx, id, "full"));
    },
  },
  {
    name: "set_hypothesis",
    title: "Save hypothesis draft",
    description:
      "Save (or update) the study's hypothesis draft. Only the fields you pass change. Fails once the hypothesis is locked. Never invent the user's rationale or rules — ask them. Dates are YYYY-MM-DD; the out-of-sample window must come after the in-sample window and not overlap it (≈70/30 split). cost_bps is the realistic round-trip cost (commission + slippage) in basis points of position value. prior_trials is how many variants the user already tried before this study. criteria fractions: min_deflated_sharpe and min_oos_efficiency are 0–1.",
    inputSchema: {
      type: "object",
      properties: {
        study_id: STUDY_ID,
        market: { type: "string", description: "e.g. 'NQ1! futures', 'BTCUSDT', 'EURUSD'" },
        timeframe: { type: "string", description: "e.g. '5m', '1h', '1D'" },
        rationale: { type: "string", description: "Why the edge should exist and who is on the other side. At least 60 characters." },
        entry_rules: { type: "string", description: "Mechanical entry rules." },
        exit_rules: { type: "string", description: "Mechanical exit rules (stop, target, time exit)." },
        in_sample_start: DATE,
        in_sample_end: DATE,
        out_of_sample_start: DATE,
        out_of_sample_end: DATE,
        account_size: { type: "number" },
        cost_bps: { type: "number" },
        prior_trials: { type: "integer" },
        criteria: {
          type: "object",
          properties: {
            min_trades: { type: "integer" },
            min_profit_factor: { type: "number" },
            min_deflated_sharpe: { type: "number" },
            max_drawdown_pct: { type: "number" },
            min_profitable_periods_pct: { type: "number" },
            min_oos_efficiency: { type: "number" },
            min_oos_profit_factor: { type: "number" },
          },
          additionalProperties: false,
        },
      },
      required: ["study_id"],
      additionalProperties: false,
    },
    annotations: { idempotentHint: true },
    async run(args, ctx) {
      const parsed = hypothesisArgs.safeParse(args);
      if (!parsed.success) return fail(`Invalid arguments: ${parsed.error.issues[0]?.message}`);
      const a = parsed.data;
      const id = await requireStudy(ctx, a.study_id);
      if (!id) return fail("Study not found.");

      const { protocol } = await loadStudy(ctx.db, id, ctx.userId);
      const h: Hypothesis = {
        ...protocol.hypothesis,
        ...(a.market !== undefined && { market: a.market }),
        ...(a.timeframe !== undefined && { timeframe: a.timeframe }),
        ...(a.rationale !== undefined && { rationale: a.rationale }),
        ...(a.entry_rules !== undefined && { entryRules: a.entry_rules }),
        ...(a.exit_rules !== undefined && { exitRules: a.exit_rules }),
        ...(a.in_sample_start !== undefined && { inSampleStart: a.in_sample_start }),
        ...(a.in_sample_end !== undefined && { inSampleEnd: a.in_sample_end }),
        ...(a.out_of_sample_start !== undefined && { outOfSampleStart: a.out_of_sample_start }),
        ...(a.out_of_sample_end !== undefined && { outOfSampleEnd: a.out_of_sample_end }),
        ...(a.account_size !== undefined && { accountSize: a.account_size }),
        ...(a.cost_bps !== undefined && { costBps: a.cost_bps }),
        ...(a.prior_trials !== undefined && { priorTrials: a.prior_trials }),
      };
      const k = a.criteria ?? {};
      const c: Criteria = {
        ...protocol.criteria,
        ...(k.min_trades !== undefined && { minTrades: k.min_trades }),
        ...(k.min_profit_factor !== undefined && { minProfitFactor: k.min_profit_factor }),
        ...(k.min_deflated_sharpe !== undefined && { minDsr: k.min_deflated_sharpe }),
        ...(k.max_drawdown_pct !== undefined && { maxDrawdownPct: k.max_drawdown_pct }),
        ...(k.min_profitable_periods_pct !== undefined && { minProfitablePeriodsPct: k.min_profitable_periods_pct }),
        ...(k.min_oos_efficiency !== undefined && { minOosEfficiency: k.min_oos_efficiency }),
        ...(k.min_oos_profit_factor !== undefined && { minOosProfitFactor: k.min_oos_profit_factor }),
      };

      const result = await saveHypothesisDraft(ctx.db, ctx.userId, id, h, c);
      if (!result.ok) return fail(result.error);
      return text(`Draft saved.\n\n${await studyText(ctx, id, "summary")}`);
    },
  },
  {
    name: "lock_hypothesis",
    title: "Lock hypothesis (pre-register)",
    description:
      "Pre-register the saved hypothesis and criteria. After this, results can be uploaded and the criteria can no longer change without a recorded amendment. Only call after the user has seen the hypothesis and agreed to lock it. If something is missing, the error lists exactly what.",
    inputSchema: {
      type: "object",
      properties: { study_id: STUDY_ID },
      required: ["study_id"],
      additionalProperties: false,
    },
    annotations: {},
    async run(args, ctx) {
      const id = await requireStudy(ctx, (args as { study_id?: unknown })?.study_id);
      if (!id) return fail("Study not found.");
      const result = await lockStudy(ctx.db, ctx.userId, id);
      if (!result.ok) return fail(`Not locked. Still needed: ${result.error}`);
      return text(`Hypothesis locked.\n\n${await studyText(ctx, id, "summary")}`);
    },
  },
  {
    name: "lint_script",
    title: "Lint Pine script",
    description:
      "Check a Pine Script v6 strategy for the patterns that make backtests lie: missing costs, no date window, lookahead, unclear sizing. Run this before save_script and fix every failure.",
    inputSchema: {
      type: "object",
      properties: { code: { type: "string", description: "The full Pine Script source." } },
      required: ["code"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    async run(args) {
      const parsed = z.object({ code: z.string().max(100_000) }).safeParse(args);
      if (!parsed.success) return fail("Pass the full script as `code`.");
      const results = lintPineScript(parsed.data.code);
      return text(
        results.map((r) => `- [${r.status.toUpperCase()}] ${r.label}: ${r.detail}`).join("\n"),
        { results },
      );
    },
  },
  {
    name: "save_script",
    title: "Save script to study",
    description:
      "Attach the final Pine Script v6 strategy to the study (it appears in the study's Script tab and the user's script library). Returns the lint results. Save the complete script, not a fragment.",
    inputSchema: {
      type: "object",
      properties: {
        study_id: STUDY_ID,
        code: { type: "string", description: "The complete Pine Script v6 source." },
        note: { type: "string", description: "Optional one-paragraph note shown above the script." },
      },
      required: ["study_id", "code"],
      additionalProperties: false,
    },
    annotations: {},
    async run(args, ctx) {
      const parsed = z
        .object({ study_id: z.string(), code: z.string(), note: z.string().max(2000).optional() })
        .safeParse(args);
      if (!parsed.success) return fail("Pass study_id and the full script as `code`.");
      const id = await requireStudy(ctx, parsed.data.study_id);
      if (!id) return fail("Study not found.");
      const result = await attachScript(ctx.db, ctx.userId, id, parsed.data.code, parsed.data.note);
      if (!result.ok) return fail(result.error);
      const lint = lintPineScript(parsed.data.code);
      const problems = lint.filter((l) => l.status !== "pass");
      return text(
        `Script saved to the study: ${studyUrl(ctx, id)}\n${
          problems.length === 0
            ? "Lint: all checks pass."
            : `Lint problems to fix:\n${problems.map((p) => `- [${p.status.toUpperCase()}] ${p.label}: ${p.detail}`).join("\n")}`
        }`,
      );
    },
  },
  {
    name: "upload_trades",
    title: "Upload trade list",
    description:
      "Upload a TradingView Strategy Tester trade-list CSV (List of trades → Export) as the CSV text. stage is in_sample, out_of_sample or incubation. Every in_sample upload counts as another trial against the deflated Sharpe. out_of_sample is a ONE-SHOT test: confirm with the user before uploading it, and never upload it twice. For large files in Claude Code, prefer get_upload_url.",
    inputSchema: {
      type: "object",
      properties: {
        study_id: STUDY_ID,
        stage: { type: "string", enum: [...RUN_STAGES] },
        csv: { type: "string", description: "The CSV file's full text." },
        file_name: { type: "string" },
      },
      required: ["study_id", "stage", "csv"],
      additionalProperties: false,
    },
    annotations: {},
    async run(args, ctx) {
      const parsed = z
        .object({
          study_id: z.string(),
          stage: z.enum(RUN_STAGES),
          csv: z.string().max(4 * 1024 * 1024),
          file_name: z.string().max(200).optional(),
        })
        .safeParse(args);
      if (!parsed.success) return fail("Pass study_id, stage and the CSV text as `csv`.");
      const id = await requireStudy(ctx, parsed.data.study_id);
      if (!id) return fail("Study not found.");
      const trades = parseTradeList(parsed.data.csv);
      if (!trades.ok) return fail(trades.error);
      const result = await recordRun(ctx.db, ctx.userId, id, {
        stage: parsed.data.stage,
        fileName: parsed.data.file_name ?? null,
        trades: trades.trades,
      });
      if (!result.ok) return fail(result.error);
      return text(
        `Recorded "${result.label}": ${trades.trades.length} closed trades${trades.skipped ? ` (${trades.skipped} open/unreadable rows skipped)` : ""}.\n\n${await studyText(ctx, id, "full")}`,
      );
    },
  },
  {
    name: "get_upload_url",
    title: "Get one-time upload link",
    description:
      "Create a one-time link (valid 30 minutes) to upload a trade-list CSV file for one study and stage without pasting it into the conversation. In Claude Code, send the file with: curl -sS --data-binary @<file.csv> -H 'Content-Type: text/csv' '<url>'. The same rules as upload_trades apply, including confirming with the user before an out_of_sample upload.",
    inputSchema: {
      type: "object",
      properties: { study_id: STUDY_ID, stage: { type: "string", enum: [...RUN_STAGES] } },
      required: ["study_id", "stage"],
      additionalProperties: false,
    },
    annotations: {},
    async run(args, ctx) {
      const parsed = z.object({ study_id: z.string(), stage: z.enum(RUN_STAGES) }).safeParse(args);
      if (!parsed.success) return fail("Pass study_id and stage.");
      const id = await requireStudy(ctx, parsed.data.study_id);
      if (!id) return fail("Study not found.");
      const { url, expiresAt } = await createUploadToken(ctx.db, {
        userId: ctx.userId,
        chatId: id,
        stage: parsed.data.stage,
      });
      return text(
        `One-time upload link for ${parsed.data.stage} (expires ${expiresAt.toISOString()}):\n${url}\n\ncurl -sS --data-binary @trades.csv -H 'Content-Type: text/csv' '${url}'\n\nThe response contains the updated study report.`,
        { url, expires_at: expiresAt.toISOString() },
      );
    },
  },
  {
    name: "pine_reference",
    title: "Search Pine v6 reference",
    description:
      "Search the complete Pine Script v6 built-in reference (every function signature, variable and constant). Use it to confirm a function exists and its exact parameters before writing it — anything not in this reference does not exist in Pine v6. Query with a name or fragment, e.g. 'strategy.exit', 'ta.atr', 'input.time', 'request.security'.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    async run(args) {
      const parsed = z.object({ query: z.string().min(1).max(100) }).safeParse(args);
      if (!parsed.success) return fail("Pass a search `query`.");
      const terms = parsed.data.query.toLowerCase().split(/\s+/).filter(Boolean);
      const hits = PINE_V6_API.split("\n").filter((line) => terms.every((t) => line.toLowerCase().includes(t)));
      if (hits.length === 0) return text(`Nothing in the Pine v6 reference matches "${parsed.data.query}". It probably does not exist.`);
      return text(`${hits.slice(0, 80).join("\n")}${hits.length > 80 ? `\n… ${hits.length - 80} more; narrow the query.` : ""}`);
    },
  },
];
