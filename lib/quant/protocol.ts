import { z } from "zod";

/**
 * The research protocol, in order. It is the same sequence a systematic
 * fund puts an idea through before capital touches it: write the claim
 * down, build it, measure it on data you are allowed to look at, try to
 * break it, then test it once on data you were not — and only then trade
 * it small and watch whether reality agrees.
 */
export const STAGES = [
  {
    id: "hypothesis",
    label: "Hypothesis",
    short: "Pre-register the edge and the pass criteria before seeing any results.",
  },
  {
    id: "build",
    label: "Build",
    short: "Implement the rules in Pine v6, with costs and a date window built in.",
  },
  {
    id: "in_sample",
    label: "In-sample",
    short: "Backtest on the development window only and upload the trade list.",
  },
  {
    id: "robustness",
    label: "Stress test",
    short: "Monte Carlo, cost stress, outlier removal and deflated Sharpe.",
  },
  {
    id: "out_of_sample",
    label: "Out-of-sample",
    short: "One run on held-out data the strategy was never tuned on.",
  },
  {
    id: "verdict",
    label: "Verdict",
    short: "Every pre-registered criterion, scored. No partial credit.",
  },
  {
    id: "incubation",
    label: "Incubation",
    short: "Paper or small-size live trades, checked against the simulated band.",
  },
] as const;

export type StageId = (typeof STAGES)[number]["id"];

export const RUN_STAGES = ["in_sample", "out_of_sample", "incubation"] as const;
export type RunStage = (typeof RUN_STAGES)[number];

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date");

export const hypothesisSchema = z.object({
  market: z.string().trim().max(120),
  timeframe: z.string().trim().max(60),
  rationale: z.string().trim().max(4000),
  entryRules: z.string().trim().max(4000),
  exitRules: z.string().trim().max(4000),
  inSampleStart: isoDay.or(z.literal("")),
  inSampleEnd: isoDay.or(z.literal("")),
  outOfSampleStart: isoDay.or(z.literal("")),
  outOfSampleEnd: isoDay.or(z.literal("")),
  accountSize: z.number().positive().max(1e10),
  /** Round-trip cost (commission + slippage) as basis points of position value. */
  costBps: z.number().min(0).max(1000),
  /** Variants already tried before this study existed — feeds the deflated Sharpe. */
  priorTrials: z.number().int().min(0).max(100000),
});

export type Hypothesis = z.infer<typeof hypothesisSchema>;

export const criteriaSchema = z.object({
  minTrades: z.number().int().min(10).max(100000),
  minProfitFactor: z.number().min(1).max(10),
  minDsr: z.number().min(0.5).max(0.999),
  maxDrawdownPct: z.number().min(1).max(100),
  minProfitablePeriodsPct: z.number().min(0).max(100),
  minOosEfficiency: z.number().min(0).max(2),
  minOosProfitFactor: z.number().min(0.5).max(10),
});

export type Criteria = z.infer<typeof criteriaSchema>;

export const DEFAULT_HYPOTHESIS: Hypothesis = {
  market: "",
  timeframe: "",
  rationale: "",
  entryRules: "",
  exitRules: "",
  inSampleStart: "",
  inSampleEnd: "",
  outOfSampleStart: "",
  outOfSampleEnd: "",
  accountSize: 10000,
  costBps: 10,
  priorTrials: 0,
};

/**
 * Defaults are deliberately strict-but-reachable. They follow common
 * practice rather than any single source: ~100 trades before a win rate
 * means much, a 95% deflated Sharpe, and an out-of-sample run that keeps
 * at least half of its in-sample risk-adjusted performance.
 */
export const DEFAULT_CRITERIA: Criteria = {
  minTrades: 100,
  minProfitFactor: 1.3,
  minDsr: 0.95,
  maxDrawdownPct: 25,
  minProfitablePeriodsPct: 60,
  minOosEfficiency: 0.5,
  minOosProfitFactor: 1.1,
};

export const MIN_RATIONALE_LENGTH = 60;

/**
 * What still has to be filled in before the hypothesis can be locked.
 * Pre-registration is the whole point of the first stage: criteria written
 * after seeing results are criteria chosen to pass.
 */
export function lockBlockers(h: Hypothesis): string[] {
  const missing: string[] = [];
  if (!h.market) missing.push("Name the market (e.g. NQ futures, BTCUSDT).");
  if (!h.timeframe) missing.push("Name the timeframe (e.g. 5m, 1D).");
  if (h.rationale.length < MIN_RATIONALE_LENGTH)
    missing.push(
      `Explain why the edge should exist in at least ${MIN_RATIONALE_LENGTH} characters — who is on the other side of the trade?`,
    );
  if (!h.entryRules) missing.push("Write down the entry rules.");
  if (!h.exitRules) missing.push("Write down the exit rules.");
  if (!h.inSampleStart || !h.inSampleEnd) missing.push("Set the in-sample date window.");
  if (!h.outOfSampleStart || !h.outOfSampleEnd) missing.push("Set the out-of-sample date window.");

  if (h.inSampleStart && h.inSampleEnd && h.inSampleStart >= h.inSampleEnd)
    missing.push("The in-sample window must end after it starts.");
  if (h.outOfSampleStart && h.outOfSampleEnd && h.outOfSampleStart >= h.outOfSampleEnd)
    missing.push("The out-of-sample window must end after it starts.");
  if (
    h.inSampleEnd &&
    h.outOfSampleStart &&
    h.inSampleStart &&
    h.outOfSampleEnd &&
    h.outOfSampleStart < h.inSampleEnd &&
    h.outOfSampleEnd > h.inSampleStart
  )
    missing.push("The two windows overlap. Out-of-sample data must never be seen during development.");

  return missing;
}

/**
 * The share of a run's trades that fall outside the window it was uploaded
 * for. A run that leaks into the other window is not the test it claims to
 * be; this is what the upload warns about.
 */
export function tradesOutsideWindow(
  exitTimes: string[],
  start: string,
  end: string,
): number {
  if (!start || !end || exitTimes.length === 0) return 0;
  const from = `${start}T00:00:00.000Z`;
  const to = `${end}T23:59:59.999Z`;
  const outside = exitTimes.filter((t) => t < from || t > to).length;
  return outside / exitTimes.length;
}
