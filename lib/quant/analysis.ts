import { bootstrap, type FanPoint, type MonteCarloResult } from "./montecarlo";
import {
  computeMetrics,
  deflatedSharpe,
  probabilisticSharpe,
  profitFactorOf,
  stdev,
  tradeReturns,
  maxDrawdown,
  type Metrics,
} from "./stats";
import { STAGES, type Criteria, type Hypothesis, type RunStage, type StageId } from "./protocol";
import type { Trade } from "./trades";

export type ProtocolInput = {
  hypothesis: Hypothesis;
  criteria: Criteria;
  lockedAt: string | null;
  amendments: number;
  /** In-sample uploads ever made, including deleted ones. */
  inSampleAttempts: number;
  oosAttempts: number;
};

export type RunInput = {
  id: string;
  stage: RunStage;
  label: string;
  fileName: string | null;
  createdAt: string;
  trades: Trade[];
};

export type EquityPoint = { trade: number; equity: number };

export type RunAnalysis = {
  id: string;
  label: string;
  fileName: string | null;
  createdAt: string;
  metrics: Metrics;
  /** Account equity in currency after each trade, downsampled for charting. */
  equity: EquityPoint[];
};

export type RunSummary = {
  id: string;
  stage: RunStage;
  label: string;
  fileName: string | null;
  createdAt: string;
  trades: number;
  profitFactor: number | null;
  sharpePerTrade: number;
};

export type CostStressRow = {
  label: string;
  multiplier: number;
  netPnl: number;
  profitFactor: number | null;
  expectancy: number;
};

export type Robustness = {
  monteCarlo: MonteCarloResult;
  psr: number;
  dsr: number;
  dsrBenchmark: number;
  trials: number;
  costStress: CostStressRow[];
  outliers: { removed: number; netPnl: number; profitFactor: number | null };
  periods: { label: string; pnl: number }[];
  periodUnit: "year" | "quarter";
  profitablePeriodsPct: number;
};

export type OosComparison = {
  efficiency: number | null;
  meanInsideCi: boolean;
  drawdownInsideBand: boolean;
};

export type IncubationStatus = "on_track" | "below_band" | "broken";

export type Incubation = {
  trades: number;
  netPnl: number;
  maxDrawdown: number;
  status: IncubationStatus;
  fan: FanPoint[];
  /** Forward equity (start = 1) after each trade, on the fan's x axis. */
  path: { trade: number; equity: number }[];
};

export type CheckStatus = "pass" | "fail" | "pending";

export type Check = {
  id: string;
  stage: StageId;
  label: string;
  explain: string;
  value: string;
  threshold: string;
  status: CheckStatus;
  critical: boolean;
};

export type Grade = "validated" | "promising" | "fragile" | "rejected" | "incomplete";

export type Verdict = {
  grade: Grade;
  headline: string;
  passed: number;
  failed: number;
  pending: number;
  flags: string[];
};

export type StageState = "done" | "current" | "todo";

export type StudyAnalysis = {
  current: StageId;
  stageStates: Record<StageId, StageState>;
  trials: number;
  inSample: RunAnalysis | null;
  outOfSample: RunAnalysis | null;
  runs: RunSummary[];
  robustness: Robustness | null;
  oos: OosComparison | null;
  incubation: Incubation | null;
  checks: Check[];
  verdict: Verdict;
};

const MAX_EQUITY_POINTS = 300;
const OUTLIER_SHARE = 0.05;

const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;
const num = (x: number | null, digits = 2) => (x === null ? "∞" : x.toFixed(digits));

function equityCurve(trades: Trade[], start: number): EquityPoint[] {
  const step = Math.max(1, Math.ceil(trades.length / MAX_EQUITY_POINTS));
  const points: EquityPoint[] = [{ trade: 0, equity: start }];
  let equity = start;
  trades.forEach((t, i) => {
    equity += t.p;
    if ((i + 1) % step === 0 || i === trades.length - 1) points.push({ trade: i + 1, equity });
  });
  return points;
}

function analyzeRun(run: RunInput, accountSize: number): RunAnalysis {
  return {
    id: run.id,
    label: run.label,
    fileName: run.fileName,
    createdAt: run.createdAt,
    metrics: computeMetrics(run.trades, accountSize),
    equity: equityCurve(run.trades, accountSize),
  };
}

/**
 * Re-runs the backtest's P&L with extra cost charged on every trade. The
 * extra is the user's own stated round-trip cost, times `multiplier`, on
 * the position's value when the export has it — otherwise on the equity
 * the trade was taken with, which assumes full allocation and so errs
 * toward too much cost rather than too little.
 */
function stressCosts(trades: Trade[], hypothesis: Hypothesis, multiplier: number): CostStressRow {
  const rate = (hypothesis.costBps / 10000) * multiplier;
  let equity = hypothesis.accountSize;
  const pnls = trades.map((t) => {
    const notional = t.v ?? Math.max(equity, 0);
    const p = t.p - notional * rate;
    equity += p;
    return p;
  });
  const netPnl = pnls.reduce((s, p) => s + p, 0);
  return {
    label: multiplier === 0 ? "As backtested" : `+${multiplier}× costs`,
    multiplier,
    netPnl,
    profitFactor: profitFactorOf(pnls),
    expectancy: pnls.length ? netPnl / pnls.length : 0,
  };
}

function periodKey(iso: string, unit: "year" | "quarter"): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  return unit === "year" ? String(y) : `${y} Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
}

/**
 * Every in-sample upload is another variant tried, and so is every
 * amendment to a locked hypothesis. Deleting a run does not give a trial
 * back — the counter on the protocol only goes up.
 */
function trialCount(input: ProtocolInput, inSampleRuns: number): number {
  return (
    input.hypothesis.priorTrials +
    Math.max(input.inSampleAttempts, inSampleRuns, 1) +
    input.amendments
  );
}

function analyzeRobustness(
  trades: Trade[],
  metrics: Metrics,
  input: ProtocolInput,
  inSampleRuns: RunInput[],
): Robustness {
  const { hypothesis, criteria } = input;
  const returns = tradeReturns(trades, hypothesis.accountSize);
  const monteCarlo = bootstrap(returns, { ruinDrawdown: criteria.maxDrawdownPct / 100 });

  const trials = trialCount(input, inSampleRuns.length);

  // The variance of Sharpe estimates across trials. With fewer than three
  // recorded runs there is nothing to estimate it from, so this falls back
  // to the estimator's own variance under no edge, 1/(n−1); with more, it
  // never goes below that floor, so a handful of similar runs cannot make
  // the bar artificially easy.
  const nullVariance = 1 / Math.max(metrics.trades - 1, 1);
  const runSharpes = inSampleRuns.map((r) => {
    const rs = tradeReturns(r.trades, hypothesis.accountSize);
    const sd = stdev(rs);
    return sd === 0 ? 0 : rs.reduce((s, x) => s + x, 0) / rs.length / sd;
  });
  const variance =
    runSharpes.length >= 3 ? Math.max(stdev(runSharpes) ** 2, nullVariance) : nullVariance;

  const { dsr, benchmark } = deflatedSharpe(
    metrics.sharpePerTrade,
    metrics.trades,
    metrics.skew,
    metrics.kurtosis,
    trials,
    variance,
  );

  const sortedByPnl = [...trades].sort((a, b) => b.p - a.p);
  const removed = Math.max(1, Math.ceil(trades.length * OUTLIER_SHARE));
  const withoutBest = sortedByPnl.slice(removed).map((t) => t.p);

  // Years are the natural regime unit, but a two-year backtest has only two
  // of them — too few to call anything consistent. Quarters below three years.
  const periodUnit = metrics.years >= 3 ? "year" : "quarter";
  const periodMap = new Map<string, number>();
  for (const t of trades) {
    const key = periodKey(t.t, periodUnit);
    periodMap.set(key, (periodMap.get(key) ?? 0) + t.p);
  }
  const periods = [...periodMap.entries()].map(([label, pnl]) => ({ label, pnl }));
  const profitable = periods.filter((p) => p.pnl > 0).length;

  return {
    monteCarlo,
    psr: probabilisticSharpe(metrics.sharpePerTrade, metrics.trades, metrics.skew, metrics.kurtosis),
    dsr,
    dsrBenchmark: benchmark,
    trials,
    costStress: [0, 1, 2].map((m) => stressCosts(trades, hypothesis, m)),
    outliers: {
      removed,
      netPnl: withoutBest.reduce((s, p) => s + p, 0),
      profitFactor: profitFactorOf(withoutBest),
    },
    periods,
    periodUnit,
    profitablePeriodsPct: periods.length ? profitable / periods.length : 0,
  };
}

function analyzeIncubation(
  trades: Trade[],
  inSampleTrades: Trade[],
  input: ProtocolInput,
  inSampleBand: number,
): Incubation {
  const { hypothesis, criteria } = input;
  const forward = tradeReturns(trades, hypothesis.accountSize);
  const reference = tradeReturns(inSampleTrades, hypothesis.accountSize);
  const mc = bootstrap(reference, {
    length: Math.max(forward.length, 1),
    ruinDrawdown: criteria.maxDrawdownPct / 100,
  });

  const path: { trade: number; equity: number }[] = [{ trade: 0, equity: 1 }];
  let equity = 1;
  forward.forEach((r, i) => {
    equity *= 1 + r;
    path.push({ trade: i + 1, equity });
  });

  const dd = maxDrawdown(forward);
  const end = mc.fan[mc.fan.length - 1];
  const status: IncubationStatus =
    dd > inSampleBand ? "broken" : equity < end.p5 ? "below_band" : "on_track";

  return {
    trades: trades.length,
    netPnl: trades.reduce((s, t) => s + t.p, 0),
    maxDrawdown: dd,
    status,
    fan: mc.fan,
    path,
  };
}

function check(
  partial: Omit<Check, "status" | "value"> & { value: string | null; pass: boolean | null },
): Check {
  const { pass, value, ...rest } = partial;
  return { ...rest, value: value ?? "—", status: pass === null ? "pending" : pass ? "pass" : "fail" };
}

function buildChecks(
  criteria: Criteria,
  inSample: RunAnalysis | null,
  robustness: Robustness | null,
  outOfSample: RunAnalysis | null,
  oos: OosComparison | null,
): Check[] {
  const m = inSample?.metrics;
  const o = outOfSample?.metrics;
  return [
    check({
      id: "sample_size",
      stage: "in_sample",
      label: "Enough trades",
      explain:
        "Below ~100 trades, a win rate or profit factor is mostly noise. Every other statistic leans on this one.",
      value: m ? String(m.trades) : null,
      threshold: `≥ ${criteria.minTrades}`,
      pass: m ? m.trades >= criteria.minTrades : null,
      critical: true,
    }),
    check({
      id: "profit_factor",
      stage: "in_sample",
      label: "In-sample profit factor",
      explain: "Gross profit over gross loss, after the costs the backtest charged.",
      value: m ? num(m.profitFactor) : null,
      threshold: `≥ ${criteria.minProfitFactor.toFixed(2)}`,
      pass: m ? m.profitFactor === null || m.profitFactor >= criteria.minProfitFactor : null,
      critical: false,
    }),
    check({
      id: "dsr",
      stage: "robustness",
      label: "Deflated Sharpe ratio",
      explain:
        "Probability the Sharpe is real after accounting for sample size, fat tails and every variant you tried. Each re-run lowers it.",
      value: robustness ? pct(robustness.dsr) : null,
      threshold: `≥ ${pct(criteria.minDsr, 0)}`,
      pass: robustness ? robustness.dsr >= criteria.minDsr : null,
      critical: true,
    }),
    check({
      id: "mc_drawdown",
      stage: "robustness",
      label: "Monte Carlo drawdown (95th pct.)",
      explain:
        "Your backtest's drawdown is one lucky or unlucky ordering of trades. This is the drawdown 1 in 20 reshuffled histories reaches.",
      value: robustness ? pct(robustness.monteCarlo.drawdown.p95) : null,
      threshold: `≤ ${criteria.maxDrawdownPct}%`,
      pass: robustness ? robustness.monteCarlo.drawdown.p95 * 100 <= criteria.maxDrawdownPct : null,
      critical: false,
    }),
    check({
      id: "cost_stress",
      stage: "robustness",
      label: "Survives doubled costs",
      explain:
        "Real fills are worse than backtest fills. An edge that disappears when costs double was never wider than the spread.",
      value: robustness ? robustness.costStress[1].netPnl.toFixed(0) : null,
      threshold: "net P&L > 0",
      pass: robustness ? robustness.costStress[1].netPnl > 0 : null,
      critical: false,
    }),
    check({
      id: "outliers",
      stage: "robustness",
      label: "Not carried by a few trades",
      explain: "Still profitable with the best 5% of trades removed — the ones you cannot count on repeating.",
      value: robustness ? robustness.outliers.netPnl.toFixed(0) : null,
      threshold: "net P&L > 0",
      pass: robustness ? robustness.outliers.netPnl > 0 : null,
      critical: false,
    }),
    check({
      id: "consistency",
      stage: "robustness",
      label: "Consistent across periods",
      explain: "Profitable in most calendar periods, not one good regime averaged over several bad ones.",
      value: robustness ? pct(robustness.profitablePeriodsPct, 0) : null,
      threshold: `≥ ${criteria.minProfitablePeriodsPct}%`,
      pass: robustness
        ? robustness.profitablePeriodsPct * 100 >= criteria.minProfitablePeriodsPct
        : null,
      critical: false,
    }),
    check({
      id: "oos_profit_factor",
      stage: "out_of_sample",
      label: "Out-of-sample profit factor",
      explain: "Profit factor on data the strategy was never developed on. The one number that cannot be overfit.",
      value: o ? num(o.profitFactor) : null,
      threshold: `≥ ${criteria.minOosProfitFactor.toFixed(2)}`,
      pass: o ? o.profitFactor === null || o.profitFactor >= criteria.minOosProfitFactor : null,
      critical: true,
    }),
    check({
      id: "oos_efficiency",
      stage: "out_of_sample",
      label: "Out-of-sample efficiency",
      explain:
        "Out-of-sample Sharpe as a share of in-sample Sharpe. Some decay is normal; losing more than half of it suggests the in-sample result was fitted.",
      value: oos ? (oos.efficiency === null ? "n/a" : pct(oos.efficiency, 0)) : null,
      threshold: `≥ ${pct(criteria.minOosEfficiency, 0)}`,
      pass: oos ? oos.efficiency !== null && oos.efficiency >= criteria.minOosEfficiency : null,
      critical: false,
    }),
    check({
      id: "oos_drawdown",
      stage: "out_of_sample",
      label: "Out-of-sample drawdown in range",
      explain: "The held-out drawdown stays inside the 95% band the Monte Carlo predicted from in-sample trades.",
      value: o ? pct(o.maxDrawdown) : null,
      threshold: robustness ? `≤ ${pct(robustness.monteCarlo.drawdown.p95)}` : "≤ MC 95th pct.",
      pass: oos ? oos.drawdownInsideBand : null,
      critical: false,
    }),
  ];
}

const DOWNGRADE: Record<Grade, Grade> = {
  validated: "promising",
  promising: "fragile",
  fragile: "rejected",
  rejected: "rejected",
  incomplete: "incomplete",
};

const HEADLINES: Record<Grade, string> = {
  validated: "Passed every pre-registered test. Ready to incubate at small size.",
  promising: "Passed the critical tests with one weakness. Incubate at reduced size.",
  fragile: "Several tests failed. The edge may be real but it is not robust.",
  rejected: "Failed a critical test. Do not trade this with real money.",
  incomplete: "Not every test has run yet.",
};

function buildVerdict(checks: Check[], input: ProtocolInput): Verdict {
  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const pending = checks.filter((c) => c.status === "pending").length;

  const flags: string[] = [];
  if (input.oosAttempts > 1) {
    flags.push(
      `Out-of-sample data was uploaded ${input.oosAttempts} times. Every look after the first is contaminated, so the grade is lowered one level.`,
    );
  }
  if (input.amendments > 0) {
    flags.push(
      `The hypothesis was amended ${input.amendments} time${input.amendments === 1 ? "" : "s"} after locking. Each amendment counts as another trial in the deflated Sharpe.`,
    );
  }

  let grade: Grade;
  if (checks.some((c) => c.critical && c.status === "fail")) grade = "rejected";
  else if (pending > 0) grade = "incomplete";
  else if (failed === 0) grade = "validated";
  else if (failed === 1) grade = "promising";
  else if (failed <= 3) grade = "fragile";
  else grade = "rejected";

  if (input.oosAttempts > 1) grade = DOWNGRADE[grade];

  return { grade, headline: HEADLINES[grade], passed, failed, pending, flags };
}

/**
 * Turns a study's stored state into everything the protocol view shows.
 * Pure and deterministic — the Monte Carlo is seeded from the trades — so
 * it can run on every page load instead of being cached and going stale.
 */
export function analyzeStudy(
  input: ProtocolInput,
  runs: RunInput[],
  hasScript: boolean,
): StudyAnalysis {
  const byStage = (stage: RunStage) =>
    runs.filter((r) => r.stage === stage).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const inSampleRuns = byStage("in_sample");
  const oosRuns = byStage("out_of_sample");
  const incubationRuns = byStage("incubation");

  const latestIs = inSampleRuns[inSampleRuns.length - 1] ?? null;
  const latestOos = oosRuns[oosRuns.length - 1] ?? null;

  const { accountSize } = input.hypothesis;
  const inSample = latestIs ? analyzeRun(latestIs, accountSize) : null;
  const outOfSample = latestOos ? analyzeRun(latestOos, accountSize) : null;

  const robustness =
    latestIs && inSample && latestIs.trades.length >= 2
      ? analyzeRobustness(latestIs.trades, inSample.metrics, input, inSampleRuns)
      : null;

  let oos: OosComparison | null = null;
  if (inSample && outOfSample && robustness) {
    const isSharpe = inSample.metrics.sharpePerTrade;
    const [lo, hi] = robustness.monteCarlo.meanReturnCi;
    oos = {
      efficiency: isSharpe > 0 ? outOfSample.metrics.sharpePerTrade / isSharpe : null,
      meanInsideCi: outOfSample.metrics.meanReturn >= lo && outOfSample.metrics.meanReturn <= hi,
      drawdownInsideBand: outOfSample.metrics.maxDrawdown <= robustness.monteCarlo.drawdown.p95,
    };
  }

  const forwardTrades = incubationRuns
    .flatMap((r) => r.trades)
    .sort((a, b) => a.t.localeCompare(b.t));
  const incubation =
    latestIs && robustness && forwardTrades.length > 0
      ? analyzeIncubation(forwardTrades, latestIs.trades, input, robustness.monteCarlo.drawdown.p95)
      : null;

  const checks = buildChecks(input.criteria, inSample, robustness, outOfSample, oos);
  const verdict = buildVerdict(checks, input);

  const done: Record<StageId, boolean> = {
    hypothesis: input.lockedAt !== null,
    build: hasScript,
    in_sample: inSample !== null,
    robustness: robustness !== null,
    out_of_sample: outOfSample !== null,
    // The verdict is where a study rests once the one-shot test is in, until
    // forward trades move it on — even when a critical failure decided the
    // grade earlier.
    verdict: outOfSample !== null && incubation !== null,
    incubation: incubation !== null,
  };
  const current = STAGES.find((s) => !done[s.id])?.id ?? "incubation";
  const stageStates = Object.fromEntries(
    STAGES.map((s) => [s.id, s.id === current ? "current" : done[s.id] ? "done" : "todo"]),
  ) as Record<StageId, StageState>;

  return {
    current,
    stageStates,
    trials: trialCount(input, inSampleRuns.length),
    inSample,
    outOfSample,
    runs: runs.map((r) => {
      const metrics = computeMetrics(r.trades, accountSize);
      return {
        id: r.id,
        stage: r.stage,
        label: r.label,
        fileName: r.fileName,
        createdAt: r.createdAt,
        trades: metrics.trades,
        profitFactor: metrics.profitFactor,
        sharpePerTrade: metrics.sharpePerTrade,
      };
    }),
    robustness,
    oos,
    incubation,
    checks,
    verdict,
  };
}
