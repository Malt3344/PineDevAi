"use client";

import { useTransition } from "react";
import {
  CircleCheck,
  CircleX,
  FileCode,
  MessageSquareText,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { deleteRun } from "@/app/(app)/studies/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProtocolInput, RunSummary, StudyAnalysis } from "@/lib/quant/analysis";
import { lintPineScript } from "@/lib/quant/pine-lint";
import type { RunStage } from "@/lib/quant/protocol";
import { cn } from "@/lib/utils";
import { DrawdownHistogram, EquityChart, FanChart, PeriodBars } from "./charts";
import { formatDate, formatMoney, formatPct, formatRatio } from "./format";
import { CheckList, GradeBadge, Section, StageIntro, Stat, StatGrid } from "./primitives";
import { RunUpload } from "./RunUpload";
import { ScriptBlock } from "./ScriptBlock";

/** Copies a prompt for the user's own Claude, which is where the work happens. */
type Ask = (text: string) => void;

/** Stage 2: the script, linted for the ways a backtest can flatter itself. */
export function BuildStage({
  code,
  protocol,
  onAsk,
}: {
  code: string | null;
  protocol: ProtocolInput;
  onAsk: Ask;
}) {
  const h = protocol.hypothesis;
  const lint = code ? lintPineScript(code) : [];
  const failures = lint.filter((l) => l.status === "fail");

  return (
    <div className="space-y-5">
      <StageIntro title="2 · Build">
        Turn the pre-registered rules into a Pine v6 strategy — with costs, a date window you
        can switch between in-sample and out-of-sample, and nothing that peeks at the future.
      </StageIntro>

      {!code ? (
        <Section title="No script yet">
          <EmptyState
            className="py-6"
            icon={FileCode}
            title="Ask Claude to write it"
            description="Claude writes exactly the rules you locked, with costs, a date window and no lookahead, and saves the script here."
            action={
              <Button
                onClick={() =>
                  onAsk(
                    `Write the Pine v6 strategy for this study's locked hypothesis. Market ${h.market}, ${h.timeframe}. Entry: ${h.entryRules} Exit: ${h.exitRules} Include the protocol scaffold, with the window defaulting to the in-sample period ${h.inSampleStart} to ${h.inSampleEnd} and costs of about ${h.costBps} bps round trip.`,
                  )
                }
              >
                <Sparkles />
                Copy prompt for Claude
              </Button>
            }
          />
        </Section>
      ) : (
        <Section
          title="Backtest hygiene"
          description="Static checks on the current script. They read the code; nothing is executed."
        >
          <ul className="divide-y divide-border">
            {lint.map((item) => (
              <li key={item.id} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                {item.status === "pass" ? (
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-label="Pass" />
                ) : item.status === "fail" ? (
                  <CircleX className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Fail" />
                ) : (
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-label="Warning" />
                )}
                <div className="min-w-0">
                  <p className="text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          {failures.length > 0 && (
            <Button
              className="mt-4"
              variant="outline"
              onClick={() =>
                onAsk(
                  `Fix these backtest-hygiene problems in the current script and return the full script: ${failures.map((f) => f.label).join("; ")}.`,
                )
              }
            >
              <Sparkles />
              Copy fix prompt for Claude
            </Button>
          )}
        </Section>
      )}

      {code && (
        <Section title="Strategy script">
          <ScriptBlock code={code} />
        </Section>
      )}

      <Section title="Then run it in TradingView">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>Copy the script into TradingView&apos;s Pine Editor and add it to a {h.market || "chart"} {h.timeframe} chart.</li>
          <li>
            In the strategy settings, set <span className="text-foreground">Window start</span> to{" "}
            <span className="font-mono text-foreground">{h.inSampleStart || "—"}</span> and{" "}
            <span className="text-foreground">Window end</span> to{" "}
            <span className="font-mono text-foreground">{h.inSampleEnd || "—"}</span>.
          </li>
          <li>Strategy Tester → List of trades → Export, then give the file to Claude (or drop it in the next stage).</li>
          <li>Do not touch the out-of-sample dates yet.</li>
        </ol>
      </Section>
    </div>
  );
}

function RunsTable({ chatId, runs, latestId }: { chatId: string; runs: RunSummary[]; latestId?: string }) {
  const [pending, startTransition] = useTransition();
  if (runs.length === 0) return null;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Run</TableHead>
          <TableHead className="text-right">Trades</TableHead>
          <TableHead className="text-right">PF</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Uploaded</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id}>
            <TableCell className="max-w-48">
              <p className="truncate text-sm">
                {run.label}
                {run.id === latestId && <span className="ml-2 text-xs text-primary">in use</span>}
              </p>
              {run.fileName && <p className="truncate text-xs text-muted-foreground">{run.fileName}</p>}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">{run.trades}</TableCell>
            <TableCell className="text-right font-mono tabular-nums">{formatRatio(run.profitFactor)}</TableCell>
            <TableCell className="hidden text-right text-xs text-muted-foreground sm:table-cell">
              {formatDate(run.createdAt)}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={pending}
                aria-label={`Delete ${run.label}`}
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteRun(chatId, run.id);
                    if (result.ok) toast.success("Run deleted. It still counts as a trial.");
                    else toast.error(result.error);
                  })
                }
              >
                <Trash2 />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MetricsBlock({ analysis, which }: { analysis: StudyAnalysis; which: "inSample" | "outOfSample" }) {
  const run = analysis[which];
  if (!run) return null;
  const m = run.metrics;
  return (
    <>
      <StatGrid>
        <Stat label="Trades" value={String(m.trades)} hint={`${formatDate(m.start)} – ${formatDate(m.end)}`} />
        <Stat label="Net P&L" value={formatMoney(m.netPnl)} tone={m.netPnl > 0 ? "good" : "bad"} hint={`${formatPct(m.totalReturn)} total`} />
        <Stat label="Profit factor" value={formatRatio(m.profitFactor)} />
        <Stat label="Win rate" value={formatPct(m.winRate)} hint={`payoff ${formatRatio(m.payoffRatio)}`} />
        <Stat label="Max drawdown" value={formatPct(m.maxDrawdown)} />
        <Stat label="Sharpe (annual)" value={formatRatio(m.sharpeAnnual)} hint={`${formatRatio(m.sharpePerTrade, 3)} per trade`} />
        <Stat label="t-statistic" value={formatRatio(m.tStat)} hint="mean return ÷ std. error" />
        <Stat label="Worst losing streak" value={String(m.maxConsecutiveLosses)} />
      </StatGrid>
      <div className="mt-4">
        <EquityChart data={run.equity} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Long {m.long.trades} trades ({formatMoney(m.long.netPnl)}) · Short {m.short.trades} trades (
        {formatMoney(m.short.netPnl)})
      </p>
    </>
  );
}

const stageChecks = (analysis: StudyAnalysis, stage: string) => analysis.checks.filter((c) => c.stage === stage);

function runsFor(analysis: StudyAnalysis, stage: RunStage) {
  return analysis.runs.filter((r) => r.stage === stage);
}

/** Stage 3: development-window backtest. Every upload is a trial. */
export function InSampleStage({
  chatId,
  protocol,
  analysis,
}: {
  chatId: string;
  protocol: ProtocolInput;
  analysis: StudyAnalysis;
}) {
  const h = protocol.hypothesis;
  return (
    <div className="space-y-5">
      <StageIntro title="3 · In-sample">
        Backtest only the development window,{" "}
        <span className="font-mono text-foreground">
          {h.inSampleStart || "—"} → {h.inSampleEnd || "—"}
        </span>
        . You can re-run here, but every upload is recorded as another trial and raises the bar
        the deflated Sharpe must clear. The latest run is the one that gets tested.
      </StageIntro>

      {analysis.inSample && (
        <Section title={`Latest run · ${analysis.inSample.label}`} description={analysis.inSample.fileName ?? undefined}>
          <MetricsBlock analysis={analysis} which="inSample" />
        </Section>
      )}

      <Section
        title={analysis.inSample ? "Record another trial" : "Upload the in-sample trade list"}
        description={`Trials so far: ${analysis.trials}`}
      >
        <RunUpload
          chatId={chatId}
          stage="in_sample"
          window={{ start: h.inSampleStart, end: h.inSampleEnd }}
          disabledReason={protocol.lockedAt ? null : "Lock the hypothesis first. Results uploaded before pre-registration prove nothing."}
        />
      </Section>

      {stageChecks(analysis, "in_sample").length > 0 && analysis.inSample && (
        <Section title="Checks at this stage">
          <CheckList checks={stageChecks(analysis, "in_sample")} />
        </Section>
      )}

      {runsFor(analysis, "in_sample").length > 0 && (
        <Section title="All in-sample runs" description="Deleting a run does not give the trial back.">
          <RunsTable chatId={chatId} runs={runsFor(analysis, "in_sample")} latestId={analysis.inSample?.id} />
        </Section>
      )}
    </div>
  );
}

/** Stage 4: try to break the in-sample result before the sealed data does. */
export function RobustnessStage({
  protocol,
  analysis,
  onAsk,
}: {
  protocol: ProtocolInput;
  analysis: StudyAnalysis;
  onAsk: Ask;
}) {
  const r = analysis.robustness;
  const m = analysis.inSample?.metrics;
  return (
    <div className="space-y-5">
      <StageIntro title="4 · Stress test">
        A backtest is one path out of many the same strategy could have taken. These tests ask
        how bad it could plausibly get, how much of the result is luck or selection, and whether
        it survives worse fills.
      </StageIntro>

      {!r || !m ? (
        <Section title="Waiting on an in-sample run">
          <p className="text-sm text-muted-foreground">Upload an in-sample trade list and every test here runs automatically.</p>
        </Section>
      ) : (
        <>
          <Section
            title="Is the Sharpe real?"
            description={`${analysis.trials} trial${analysis.trials === 1 ? "" : "s"} counted · Bailey & López de Prado`}
          >
            <StatGrid>
              <Stat label="Sharpe per trade" value={formatRatio(m.sharpePerTrade, 3)} />
              <Stat label="Probabilistic Sharpe" value={formatPct(r.psr)} hint="vs. zero" />
              <Stat label="Best-of-noise bar" value={formatRatio(r.dsrBenchmark, 3)} hint={`luck, best of ${analysis.trials}`} />
              <Stat
                label="Deflated Sharpe"
                value={formatPct(r.dsr)}
                tone={r.dsr >= protocol.criteria.minDsr ? "good" : "bad"}
                hint={`need ${formatPct(protocol.criteria.minDsr, 0)}`}
              />
            </StatGrid>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              The deflated Sharpe is the probability that the true Sharpe beats what the best of{" "}
              {analysis.trials} random strategies would show by luck, adjusted for skew ({formatRatio(m.skew)}) and
              kurtosis ({formatRatio(m.kurtosis)}) of the returns.
            </p>
          </Section>

          <Section
            title="Monte Carlo"
            description={`${r.monteCarlo.paths.toLocaleString()} bootstrap paths of ${m.trades} trades each`}
          >
            <StatGrid>
              <Stat label="Median drawdown" value={formatPct(r.monteCarlo.drawdown.p50)} />
              <Stat
                label="95th pct. drawdown"
                value={formatPct(r.monteCarlo.drawdown.p95)}
                tone={r.monteCarlo.drawdown.p95 * 100 <= protocol.criteria.maxDrawdownPct ? "good" : "bad"}
                hint={`backtest showed ${formatPct(m.maxDrawdown)}`}
              />
              <Stat label="Chance of a loss" value={formatPct(r.monteCarlo.probLoss)} hint={`over ${m.trades} trades`} />
              <Stat label="Hits your limit" value={formatPct(r.monteCarlo.probRuin)} hint={`${protocol.criteria.maxDrawdownPct}% drawdown`} />
            </StatGrid>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Simulated equity, 5–95% band and median</p>
                <FanChart fan={r.monteCarlo.fan} />
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Distribution of maximum drawdown</p>
                <DrawdownHistogram
                  bins={r.monteCarlo.drawdownHistogram}
                  limit={protocol.criteria.maxDrawdownPct / 100}
                  p95={r.monteCarlo.drawdown.p95}
                />
              </div>
            </div>
          </Section>

          <div className="grid gap-5 lg:grid-cols-2">
            <Section title="Cost stress" description={`Extra ${protocol.hypothesis.costBps} bps per round trip, per step`}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scenario</TableHead>
                    <TableHead className="text-right">Net P&L</TableHead>
                    <TableHead className="text-right">PF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.costStress.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell>{row.label}</TableCell>
                      <TableCell className={cn("text-right font-mono tabular-nums", row.netPnl < 0 && "text-destructive")}>
                        {formatMoney(row.netPnl)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatRatio(row.profitFactor)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell>Without best {r.outliers.removed} trades</TableCell>
                    <TableCell className={cn("text-right font-mono tabular-nums", r.outliers.netPnl < 0 && "text-destructive")}>
                      {formatMoney(r.outliers.netPnl)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatRatio(r.outliers.profitFactor)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Section>

            <Section
              title="Consistency"
              description={`${formatPct(r.profitablePeriodsPct, 0)} of ${r.periodUnit === "year" ? "years" : "quarters"} profitable`}
            >
              <PeriodBars periods={r.periods} />
            </Section>
          </div>

          <Section
            title="Checks at this stage"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onAsk("Walk me through this study's stress-test results. What is the weakest point, and what does it mean for trading it?")
                }
              >
                <MessageSquareText />
                Ask Claude to explain
              </Button>
            }
          >
            <CheckList checks={stageChecks(analysis, "robustness")} />
          </Section>
        </>
      )}
    </div>
  );
}

/** Stage 5: the one-shot test on held-out data. */
export function OutOfSampleStage({
  chatId,
  protocol,
  analysis,
}: {
  chatId: string;
  protocol: ProtocolInput;
  analysis: StudyAnalysis;
}) {
  const h = protocol.hypothesis;
  const is = analysis.inSample?.metrics;
  const oos = analysis.outOfSample?.metrics;
  const criticalFailed = analysis.checks.some((c) => c.critical && c.status === "fail" && c.stage !== "out_of_sample");

  return (
    <div className="space-y-5">
      <StageIntro title="5 · Out-of-sample">
        Change the script&apos;s window to{" "}
        <span className="font-mono text-foreground">
          {h.outOfSampleStart || "—"} → {h.outOfSampleEnd || "—"}
        </span>{" "}
        — without changing anything else — and upload the trades. This data was never used to
        develop the strategy, so it is the closest thing to the future you have. It works once.
      </StageIntro>

      {!oos && criticalFailed && (
        <p className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          A critical in-sample test already failed. Spending the sealed data on this version means
          you will not have clean data for a better one.
        </p>
      )}

      {protocol.oosAttempts > 1 && (
        <p className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Out-of-sample data has been uploaded {protocol.oosAttempts} times. The verdict is lowered one level.
        </p>
      )}

      {is && oos && (
        <Section title="In-sample vs. out-of-sample">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">In-sample</TableHead>
                <TableHead className="text-right">Out-of-sample</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(
                [
                  ["Trades", String(is.trades), String(oos.trades)],
                  ["Profit factor", formatRatio(is.profitFactor), formatRatio(oos.profitFactor)],
                  ["Win rate", formatPct(is.winRate), formatPct(oos.winRate)],
                  ["Mean return / trade", formatPct(is.meanReturn, 3), formatPct(oos.meanReturn, 3)],
                  ["Sharpe per trade", formatRatio(is.sharpePerTrade, 3), formatRatio(oos.sharpePerTrade, 3)],
                  ["Max drawdown", formatPct(is.maxDrawdown), formatPct(oos.maxDrawdown)],
                ] as const
              ).map(([label, a, b]) => (
                <TableRow key={label}>
                  <TableCell>{label}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{a}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{b}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {analysis.oos && (
            <p className="mt-3 text-xs text-muted-foreground">
              Efficiency {analysis.oos.efficiency === null ? "n/a" : formatPct(analysis.oos.efficiency, 0)} · out-of-sample
              mean return is {analysis.oos.meanInsideCi ? "inside" : "outside"} the in-sample 95% bootstrap interval.
            </p>
          )}
        </Section>
      )}

      {analysis.outOfSample && (
        <Section title="Out-of-sample run" description={analysis.outOfSample.fileName ?? undefined}>
          <MetricsBlock analysis={analysis} which="outOfSample" />
        </Section>
      )}

      {!oos && (
        <Section title="Upload the out-of-sample trade list">
          <RunUpload
            chatId={chatId}
            stage="out_of_sample"
            window={{ start: h.outOfSampleStart, end: h.outOfSampleEnd }}
            disabledReason={analysis.inSample ? null : "Finish the in-sample stage first."}
          />
        </Section>
      )}

      {oos && (
        <Section title="Checks at this stage">
          <CheckList checks={stageChecks(analysis, "out_of_sample")} />
        </Section>
      )}
    </div>
  );
}

/** Stage 6: the scorecard. Reused read-only on the public share page. */
export function VerdictReport({ analysis }: { analysis: StudyAnalysis }) {
  const v = analysis.verdict;
  return (
    <div className="space-y-5">
      <div
        className={cn(
          "rounded-xl border p-5",
          v.grade === "validated" || v.grade === "promising"
            ? "border-primary/30 bg-primary/5"
            : v.grade === "rejected"
              ? "border-destructive/30 bg-destructive/5"
              : v.grade === "fragile"
                ? "border-warning/30 bg-warning/5"
                : "border-border bg-card",
        )}
      >
        <GradeBadge grade={v.grade} className="text-sm" />
        <p className="mt-3 text-lg font-semibold tracking-tight text-balance">{v.headline}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {v.passed} passed · {v.failed} failed · {v.pending} pending · {analysis.trials} trial
          {analysis.trials === 1 ? "" : "s"} counted
        </p>
        {v.flags.length > 0 && (
          <ul className="mt-3 space-y-1">
            {v.flags.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-warning">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Section title="Pre-registered criteria">
        <CheckList checks={analysis.checks} />
      </Section>
    </div>
  );
}

export function VerdictStage({ analysis, onAsk }: { analysis: StudyAnalysis; onAsk: Ask }) {
  return (
    <div className="space-y-5">
      <StageIntro title="6 · Verdict">
        Every criterion you locked in stage 1, scored against the evidence. Critical failures
        reject the strategy outright; the rest decide how much confidence it has earned.
      </StageIntro>
      <VerdictReport analysis={analysis} />
      {analysis.verdict.grade !== "incomplete" && (
        <Button
          variant="outline"
          onClick={() =>
            onAsk(
              analysis.verdict.grade === "rejected" || analysis.verdict.grade === "fragile"
                ? "The study didn't pass. Explain honestly why, what (if anything) is worth salvaging as a new hypothesis, and what I should not do next."
                : "The study passed. How should I size it for incubation, and what would tell me it has stopped working?",
            )
          }
        >
          <MessageSquareText />
          Ask Claude about the verdict
        </Button>
      )}
    </div>
  );
}

const INCUBATION_COPY = {
  on_track: { label: "On track", detail: "Forward results are inside the band the in-sample trades predict.", className: "text-primary" },
  below_band: {
    label: "Below band",
    detail: "Cumulative return is under the 5th percentile of simulated paths. Reduce size and watch closely.",
    className: "text-warning",
  },
  broken: {
    label: "Broken",
    detail: "Drawdown has exceeded the 95th percentile the Monte Carlo allowed for. Stop trading it.",
    className: "text-destructive",
  },
} as const;

/** Stage 7: forward trades, against the band the backtest says to expect. */
export function IncubationStage({
  chatId,
  analysis,
}: {
  chatId: string;
  analysis: StudyAnalysis;
}) {
  const inc = analysis.incubation;
  const ready = analysis.verdict.grade === "validated" || analysis.verdict.grade === "promising";
  return (
    <div className="space-y-5">
      <StageIntro title="7 · Incubation">
        Paper trade it, or trade it at a fraction of intended size, and upload the forward trades
        as they accumulate. Each batch is plotted against the range the in-sample trades predict,
        so you know early when live behaviour stops matching the backtest.
      </StageIntro>

      {!ready && (
        <p className="flex items-start gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Incubation is meant for strategies that passed the verdict. You can still track one here.
        </p>
      )}

      {inc && (
        <Section title="Forward test">
          <StatGrid>
            <Stat label="Status" value={INCUBATION_COPY[inc.status].label} tone={inc.status === "on_track" ? "good" : "bad"} />
            <Stat label="Forward trades" value={String(inc.trades)} />
            <Stat label="Net P&L" value={formatMoney(inc.netPnl)} tone={inc.netPnl >= 0 ? "good" : "bad"} />
            <Stat label="Max drawdown" value={formatPct(inc.maxDrawdown)} />
          </StatGrid>
          <p className={cn("mt-3 text-sm", INCUBATION_COPY[inc.status].className)}>{INCUBATION_COPY[inc.status].detail}</p>
          <div className="mt-4">
            <FanChart fan={inc.fan} path={inc.path} />
          </div>
        </Section>
      )}

      <Section title="Upload forward trades">
        <RunUpload
          chatId={chatId}
          stage="incubation"
          disabledReason={analysis.inSample ? null : "Finish the in-sample stage first."}
        />
      </Section>

      {runsFor(analysis, "incubation").length > 0 && (
        <Section title="Forward batches">
          <RunsTable chatId={chatId} runs={runsFor(analysis, "incubation")} />
        </Section>
      )}
    </div>
  );
}
