import type { ProtocolInput, StudyAnalysis } from "./analysis";
import { STAGES } from "./protocol";

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/**
 * What the research assistant knows about the study it is sitting in.
 * Appended to the system prompt on every turn, so the model always argues
 * from the actual pre-registered hypothesis and the actual numbers rather
 * than whatever the user remembers them to be.
 */
export function studyContext(protocol: ProtocolInput, analysis: StudyAnalysis): string {
  const h = protocol.hypothesis;
  const stage = STAGES.find((s) => s.id === analysis.current);
  const lines: string[] = [
    "## This study",
    `Current protocol stage: ${stage?.label ?? analysis.current}.`,
    `Hypothesis ${protocol.lockedAt ? `locked (pre-registered) on ${protocol.lockedAt.slice(0, 10)}` : "NOT yet locked — still a draft"}.`,
    `Market: ${h.market || "(not set)"} · Timeframe: ${h.timeframe || "(not set)"}`,
    `Why the edge should exist: ${h.rationale || "(not written yet)"}`,
    `Entry rules: ${h.entryRules || "(not written yet)"}`,
    `Exit rules: ${h.exitRules || "(not written yet)"}`,
    `In-sample window: ${h.inSampleStart || "?"} to ${h.inSampleEnd || "?"} · Out-of-sample window: ${h.outOfSampleStart || "?"} to ${h.outOfSampleEnd || "?"}`,
    `Account size: ${h.accountSize} · Assumed round-trip cost: ${h.costBps} bps of position value`,
    `Trials so far (variants tried, counted against the deflated Sharpe): ${analysis.trials}`,
  ];

  const m = analysis.inSample?.metrics;
  if (m) {
    lines.push(
      `Latest in-sample run: ${m.trades} trades, win rate ${pct(m.winRate)}, profit factor ${m.profitFactor?.toFixed(2) ?? "∞"}, max drawdown ${pct(m.maxDrawdown)}, per-trade Sharpe ${m.sharpePerTrade.toFixed(3)}.`,
    );
  }
  const r = analysis.robustness;
  if (r) {
    lines.push(
      `Stress test: deflated Sharpe ${pct(r.dsr)} (vs. benchmark Sharpe ${r.dsrBenchmark.toFixed(3)}), Monte Carlo 95th-pct drawdown ${pct(r.monteCarlo.drawdown.p95)}, net P&L at doubled costs ${r.costStress[1].netPnl.toFixed(0)}, without top ${r.outliers.removed} trades ${r.outliers.netPnl.toFixed(0)}.`,
    );
  }
  const o = analysis.outOfSample?.metrics;
  if (o) {
    lines.push(
      `Out-of-sample run: ${o.trades} trades, profit factor ${o.profitFactor?.toFixed(2) ?? "∞"}, max drawdown ${pct(o.maxDrawdown)}, efficiency ${analysis.oos?.efficiency === null || !analysis.oos ? "n/a" : pct(analysis.oos.efficiency)}.`,
    );
  }
  lines.push(`Verdict: ${analysis.verdict.grade} — ${analysis.verdict.headline}`);
  for (const c of analysis.checks.filter((c) => c.status === "fail")) {
    lines.push(`FAILED: ${c.label} (${c.value}, needed ${c.threshold})`);
  }
  if (h.inSampleStart && h.outOfSampleEnd) {
    const start = [h.inSampleStart, h.outOfSampleStart].sort()[0];
    const end = [h.inSampleEnd, h.outOfSampleEnd].sort()[1];
    lines.push(
      `When writing this study's script, default the window inputs to the in-sample window (${h.inSampleStart} to ${h.inSampleEnd}); the full data range is ${start} to ${end}.`,
    );
  }
  return lines.join("\n");
}
