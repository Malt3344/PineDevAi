import type { Trade } from "./trades";

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const EULER_GAMMA = 0.5772156649;

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/** Sample standard deviation (n − 1). */
export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) ** 2;
  return Math.sqrt(s / (xs.length - 1));
}

export function skewness(xs: number[]): number {
  const n = xs.length;
  const sd = stdev(xs);
  if (n < 3 || sd === 0) return 0;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += ((x - m) / sd) ** 3;
  return s / n;
}

/** Kurtosis, not excess kurtosis — a normal distribution is 3. */
export function kurtosis(xs: number[]): number {
  const n = xs.length;
  const sd = stdev(xs);
  if (n < 4 || sd === 0) return 3;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += ((x - m) / sd) ** 4;
  return s / n;
}

/** Standard normal CDF (Abramowitz & Stegun 7.1.26, |error| < 7.5e-8). */
export function normCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-z * z);
  return 0.5 * (1 + sign * y);
}

/** Inverse standard normal CDF (Acklam's rational approximation). */
export function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;
  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - low) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** Linear-interpolated percentile of an already-sorted array, p in [0, 1]. */
export function percentileSorted(sorted: ArrayLike<number>, p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Per-trade returns on a compounding account: each trade's P&L divided by
 * the equity it was taken with. Dollar P&L alone would make a strategy that
 * doubled its account look like it got "better" later just because it was
 * trading bigger.
 */
export function tradeReturns(trades: Trade[], startingEquity: number): number[] {
  const out: number[] = [];
  let equity = startingEquity;
  for (const trade of trades) {
    // A blown account has no meaningful return on the next trade.
    const base = equity > 0 ? equity : startingEquity;
    out.push(trade.p / base);
    equity += trade.p;
  }
  return out;
}

/** Peak-to-trough decline of the compounded equity curve, as a positive fraction. */
export function maxDrawdown(returns: ArrayLike<number>): number {
  let equity = 1;
  let peak = 1;
  let worst = 0;
  for (let i = 0; i < returns.length; i++) {
    equity *= 1 + returns[i];
    if (equity > peak) peak = equity;
    const dd = peak > 0 ? (peak - equity) / peak : 1;
    if (dd > worst) worst = dd;
  }
  return Math.min(worst, 1);
}

/**
 * Probabilistic Sharpe Ratio (Bailey & López de Prado, 2012): the
 * probability that the true Sharpe exceeds `benchmark`, given how many
 * observations the estimate rests on and how skewed and fat-tailed they
 * are. A high Sharpe from 25 lumpy trades is much weaker evidence than the
 * same Sharpe from 400 well-behaved ones, and this is what says by how much.
 */
export function probabilisticSharpe(
  sharpe: number,
  n: number,
  skew: number,
  kurt: number,
  benchmark = 0,
): number {
  if (n < 2) return 0;
  const denom = 1 - skew * sharpe + ((kurt - 1) / 4) * sharpe * sharpe;
  if (denom <= 0) return sharpe > benchmark ? 1 : 0;
  return normCdf(((sharpe - benchmark) * Math.sqrt(n - 1)) / Math.sqrt(denom));
}

/**
 * The Sharpe ratio you would expect from the best of `trials` strategies
 * with no edge at all (Bailey & López de Prado, 2014). Every variant tried
 * raises this bar: test 50 parameter sets on noise and the best one will
 * look good by luck alone. One trial means no selection, so the bar is 0.
 */
export function expectedMaxSharpe(trials: number, variance: number): number {
  if (trials <= 1 || variance <= 0) return 0;
  return (
    Math.sqrt(variance) *
    ((1 - EULER_GAMMA) * normInv(1 - 1 / trials) + EULER_GAMMA * normInv(1 - 1 / (trials * Math.E)))
  );
}

/**
 * Deflated Sharpe Ratio: the PSR measured against the best-of-N-noise bar
 * above instead of against zero. This is the protocol's central defence
 * against overfitting — it is the number that gets worse every time the
 * user tweaks a parameter and re-runs.
 */
export function deflatedSharpe(
  sharpe: number,
  n: number,
  skew: number,
  kurt: number,
  trials: number,
  trialSharpeVariance: number,
): { dsr: number; benchmark: number } {
  const benchmark = expectedMaxSharpe(trials, trialSharpeVariance);
  return { dsr: probabilisticSharpe(sharpe, n, skew, kurt, benchmark), benchmark };
}

export type YearRow = { year: number; trades: number; pnl: number; returnPct: number };

export type Metrics = {
  trades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  payoffRatio: number | null;
  /** Null when there are no losing trades — infinite, not a number to compare. */
  profitFactor: number | null;
  netPnl: number;
  expectancy: number;
  meanReturn: number;
  totalReturn: number;
  cagr: number | null;
  maxDrawdown: number;
  sharpePerTrade: number;
  sharpeAnnual: number | null;
  tStat: number;
  skew: number;
  kurtosis: number;
  maxConsecutiveLosses: number;
  tradesPerYear: number | null;
  years: number;
  start: string;
  end: string;
  long: { trades: number; netPnl: number };
  short: { trades: number; netPnl: number };
  byYear: YearRow[];
};

export function profitFactorOf(pnls: number[]): number | null {
  let wins = 0;
  let losses = 0;
  for (const p of pnls) {
    if (p > 0) wins += p;
    else losses -= p;
  }
  if (losses === 0) return wins > 0 ? null : 0;
  return wins / losses;
}

/** Everything the report shows about one run of trades. */
export function computeMetrics(trades: Trade[], startingEquity: number): Metrics {
  const pnls = trades.map((t) => t.p);
  const returns = tradeReturns(trades, startingEquity);
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p <= 0);
  const n = trades.length;

  const start = trades[0]?.e ?? trades[0]?.t ?? new Date(0).toISOString();
  const end = trades[n - 1]?.t ?? start;
  const spanMs = Math.max(new Date(end).getTime() - new Date(start).getTime(), 24 * 60 * 60 * 1000);
  const years = spanMs / MS_PER_YEAR;

  const sd = stdev(returns);
  const m = mean(returns);
  const sharpePerTrade = sd === 0 ? 0 : m / sd;
  // Below roughly a quarter of a year, annualising extrapolates more than
  // it measures.
  const tradesPerYear = years >= 0.25 ? n / years : null;

  let compounded = 1;
  for (const r of returns) compounded *= 1 + r;

  let streak = 0;
  let maxStreak = 0;
  for (const p of pnls) {
    streak = p <= 0 ? streak + 1 : 0;
    maxStreak = Math.max(maxStreak, streak);
  }

  const yearMap = new Map<number, { trades: number; pnl: number; growth: number }>();
  trades.forEach((trade, i) => {
    const year = new Date(trade.t).getUTCFullYear();
    const row = yearMap.get(year) ?? { trades: 0, pnl: 0, growth: 1 };
    row.trades++;
    row.pnl += trade.p;
    row.growth *= 1 + returns[i];
    yearMap.set(year, row);
  });

  const side = (d: "long" | "short") => {
    const subset = trades.filter((t) => t.d === d);
    return { trades: subset.length, netPnl: subset.reduce((s, t) => s + t.p, 0) };
  };

  return {
    trades: n,
    winRate: n === 0 ? 0 : wins.length / n,
    avgWin: mean(wins),
    avgLoss: mean(losses),
    payoffRatio: losses.length && mean(losses) !== 0 ? mean(wins) / Math.abs(mean(losses)) : null,
    profitFactor: profitFactorOf(pnls),
    netPnl: pnls.reduce((s, p) => s + p, 0),
    expectancy: mean(pnls),
    meanReturn: m,
    totalReturn: compounded - 1,
    cagr: years >= 0.25 && compounded > 0 ? compounded ** (1 / years) - 1 : null,
    maxDrawdown: maxDrawdown(returns),
    sharpePerTrade,
    sharpeAnnual: tradesPerYear === null ? null : sharpePerTrade * Math.sqrt(tradesPerYear),
    tStat: sd === 0 ? 0 : m / (sd / Math.sqrt(n)),
    skew: skewness(returns),
    kurtosis: kurtosis(returns),
    maxConsecutiveLosses: maxStreak,
    tradesPerYear,
    years,
    start,
    end,
    long: side("long"),
    short: side("short"),
    byYear: [...yearMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([year, row]) => ({ year, trades: row.trades, pnl: row.pnl, returnPct: row.growth - 1 })),
  };
}
