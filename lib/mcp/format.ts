import type { ProtocolInput, StudyAnalysis } from "@/lib/quant/analysis";
import { STAGES } from "@/lib/quant/protocol";

/**
 * Study state as text for Claude to read. Terse, labelled lines rather
 * than prose: the model reasons over the numbers and writes the prose for
 * the user itself.
 */

const pct = (x: number | null | undefined, d = 1) =>
  x === null || x === undefined || !Number.isFinite(x) ? "n/a" : `${(x * 100).toFixed(d)}%`;
const num = (x: number | null | undefined, d = 2) =>
  x === null ? "∞" : x === undefined || !Number.isFinite(x) ? "n/a" : x.toFixed(d);

/** What the user (or Claude) should do next, given where the study is. */
export function nextStep(protocol: ProtocolInput, analysis: StudyAnalysis): string {
  const h = protocol.hypothesis;
  switch (analysis.current) {
    case "hypothesis":
      return "Fill in the hypothesis with set_hypothesis (ask the user for anything missing — never invent their rationale), show it to them, then lock_hypothesis once they confirm.";
    case "build":
      return "Write the Pine v6 strategy from the locked rules with the protocol scaffold, then save_script. Tell the user to paste it into TradingView.";
    case "in_sample":
      return `In TradingView, set Window start/end to ${h.inSampleStart} → ${h.inSampleEnd}, run the Strategy Tester, export List of trades as CSV, and upload it as stage "in_sample".`;
    case "robustness":
    case "out_of_sample":
      return `Review the stress test with the user. If they want to proceed, set the window to ${h.outOfSampleStart} → ${h.outOfSampleEnd} WITHOUT changing anything else, and upload the trades as stage "out_of_sample". Get explicit confirmation first: it is a one-shot test.`;
    case "verdict":
      return "Explain the verdict honestly. If it passed, discuss small-size incubation; if not, discuss what (if anything) is worth a new, separate hypothesis.";
    case "incubation":
      return 'Upload forward (paper or small-size) trades as stage "incubation" as they accumulate, and compare them against the band.';
  }
}

export function formatStudy(
  study: { id: string; title: string; url: string },
  protocol: ProtocolInput,
  analysis: StudyAnalysis,
  detail: "summary" | "full",
): string {
  const h = protocol.hypothesis;
  const c = protocol.criteria;
  const stage = STAGES.find((s) => s.id === analysis.current);
  const lines: string[] = [
    `# ${study.title}`,
    `study_id: ${study.id}`,
    `Open in PineDev: ${study.url}`,
    `Stage: ${stage?.label} (${analysis.current}) · Verdict: ${analysis.verdict.grade} — ${analysis.verdict.headline}`,
    `Trials counted: ${analysis.trials}`,
    "",
    "## Hypothesis",
    `Status: ${protocol.lockedAt ? `locked ${protocol.lockedAt.slice(0, 10)}` : "draft (not locked)"}${protocol.amendments ? `, amended ${protocol.amendments}×` : ""}`,
    `Market: ${h.market || "—"} · Timeframe: ${h.timeframe || "—"}`,
    `Rationale: ${h.rationale || "—"}`,
    `Entry: ${h.entryRules || "—"}`,
    `Exit: ${h.exitRules || "—"}`,
    `In-sample: ${h.inSampleStart || "?"} → ${h.inSampleEnd || "?"} · Out-of-sample: ${h.outOfSampleStart || "?"} → ${h.outOfSampleEnd || "?"}`,
    `Account: ${h.accountSize} · Round-trip cost: ${h.costBps} bps · Prior variants tried: ${h.priorTrials}`,
    `Criteria: trades ≥ ${c.minTrades}, PF ≥ ${c.minProfitFactor}, deflated Sharpe ≥ ${pct(c.minDsr, 0)}, MC 95% DD ≤ ${c.maxDrawdownPct}%, profitable periods ≥ ${c.minProfitablePeriodsPct}%, OOS efficiency ≥ ${pct(c.minOosEfficiency, 0)}, OOS PF ≥ ${c.minOosProfitFactor}`,
  ];

  const m = analysis.inSample?.metrics;
  if (m) {
    lines.push(
      "",
      `## In-sample (${analysis.inSample?.label})`,
      `${m.trades} trades, ${m.start.slice(0, 10)} → ${m.end.slice(0, 10)}`,
      `Net P&L ${m.netPnl.toFixed(0)} (${pct(m.totalReturn)}), PF ${num(m.profitFactor)}, win rate ${pct(m.winRate)}, payoff ${num(m.payoffRatio)}`,
      `Max DD ${pct(m.maxDrawdown)}, Sharpe/trade ${num(m.sharpePerTrade, 3)}, annual Sharpe ${num(m.sharpeAnnual)}, t-stat ${num(m.tStat)}, worst losing streak ${m.maxConsecutiveLosses}`,
      `Long ${m.long.trades} trades (${m.long.netPnl.toFixed(0)}), short ${m.short.trades} trades (${m.short.netPnl.toFixed(0)})`,
    );
  }

  const r = analysis.robustness;
  if (r && detail === "full") {
    lines.push(
      "",
      "## Stress test",
      `PSR ${pct(r.psr)}, deflated Sharpe ${pct(r.dsr)} (best-of-${r.trials}-noise bar ${num(r.dsrBenchmark, 3)})`,
      `Monte Carlo (${r.monteCarlo.paths} paths): DD median ${pct(r.monteCarlo.drawdown.p50)}, 95th ${pct(r.monteCarlo.drawdown.p95)}, 99th ${pct(r.monteCarlo.drawdown.p99)}; P(loss) ${pct(r.monteCarlo.probLoss)}; P(hit DD limit) ${pct(r.monteCarlo.probRuin)}`,
      `Costs: ${r.costStress.map((s) => `${s.label} ${s.netPnl.toFixed(0)} (PF ${num(s.profitFactor)})`).join("; ")}`,
      `Without best ${r.outliers.removed} trades: ${r.outliers.netPnl.toFixed(0)} (PF ${num(r.outliers.profitFactor)})`,
      `Profitable ${r.periodUnit}s: ${pct(r.profitablePeriodsPct, 0)} — ${r.periods.map((p) => `${p.label} ${p.pnl.toFixed(0)}`).join(", ")}`,
    );
  }

  const o = analysis.outOfSample?.metrics;
  if (o) {
    lines.push(
      "",
      "## Out-of-sample",
      `${o.trades} trades, PF ${num(o.profitFactor)}, win rate ${pct(o.winRate)}, max DD ${pct(o.maxDrawdown)}, Sharpe/trade ${num(o.sharpePerTrade, 3)}`,
      `Efficiency vs in-sample ${analysis.oos?.efficiency === null || !analysis.oos ? "n/a" : pct(analysis.oos.efficiency, 0)}; mean return ${analysis.oos?.meanInsideCi ? "inside" : "outside"} the in-sample 95% interval`,
    );
  }

  const inc = analysis.incubation;
  if (inc) {
    lines.push("", "## Incubation", `${inc.trades} forward trades, net ${inc.netPnl.toFixed(0)}, max DD ${pct(inc.maxDrawdown)} — status: ${inc.status}`);
  }

  lines.push("", "## Checks");
  for (const check of analysis.checks) {
    const mark = check.status === "pass" ? "PASS" : check.status === "fail" ? "FAIL" : "pending";
    lines.push(`- [${mark}] ${check.label}${check.critical ? " (critical)" : ""}: ${check.value} (needs ${check.threshold})`);
  }
  for (const flag of analysis.verdict.flags) lines.push(`- FLAG: ${flag}`);

  lines.push("", `## Next step`, nextStep(protocol, analysis));
  return lines.join("\n");
}
