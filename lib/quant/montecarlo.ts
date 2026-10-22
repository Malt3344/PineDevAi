import { maxDrawdown, percentileSorted } from "./stats";

/**
 * mulberry32 — a tiny seeded PRNG. Monte Carlo results have to be
 * reproducible: the same trade list must give the same report on every
 * page load, or a user refreshing the page would watch the verdict wobble
 * and reasonably stop trusting any of it.
 */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable seed derived from the data itself, so the seed travels with it. */
export function seedFrom(values: number[]): number {
  let h = 2166136261;
  for (const v of values) {
    const s = v.toFixed(8);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  return h >>> 0;
}

export type FanPoint = { trade: number; p5: number; p25: number; p50: number; p75: number; p95: number };

export type MonteCarloResult = {
  paths: number;
  /** Max drawdown percentiles across simulated paths, as fractions. */
  drawdown: { p50: number; p95: number; p99: number };
  /** Total return percentiles over a run of the same length. */
  finalReturn: { p5: number; p50: number; p95: number };
  /** 95% bootstrap interval of the mean per-trade return. */
  meanReturnCi: [number, number];
  /** Share of paths that ended below where they started. */
  probLoss: number;
  /** Share of paths whose drawdown reached the user's stated tolerance. */
  probRuin: number;
  /** Equity percentiles (start = 1) at evenly spaced trade counts, for the fan chart. */
  fan: FanPoint[];
  /** Histogram of simulated max drawdowns, for the distribution chart. */
  drawdownHistogram: { from: number; to: number; count: number }[];
};

const FAN_POINTS = 60;
const HISTOGRAM_BINS = 24;

/**
 * Bootstrap Monte Carlo: resample the trade returns with replacement into
 * `paths` alternative histories of `length` trades each.
 *
 * A single backtest is one draw from the distribution of outcomes the
 * strategy could have produced. Its drawdown in particular is a lucky or
 * unlucky ordering — reshuffle the same trades and the worst stretch is
 * often far deeper. The 95th-percentile drawdown here, not the backtest's,
 * is the number to size a position against.
 */
export function bootstrap(
  returns: number[],
  options: { paths?: number; length?: number; ruinDrawdown: number; seed?: number },
): MonteCarloResult {
  const paths = options.paths ?? 2000;
  const length = options.length ?? returns.length;
  const random = seededRandom(options.seed ?? seedFrom(returns));
  const n = returns.length;

  const step = Math.max(1, Math.ceil(length / FAN_POINTS));
  const checkpoints: number[] = [];
  for (let k = step; k < length; k += step) checkpoints.push(k);
  checkpoints.push(length);

  const drawdowns = new Float64Array(paths);
  const finals = new Float64Array(paths);
  const means = new Float64Array(paths);
  const atCheckpoint = checkpoints.map(() => new Float64Array(paths));
  const path = new Float64Array(length);

  for (let p = 0; p < paths; p++) {
    let equity = 1;
    let sum = 0;
    let c = 0;
    for (let i = 0; i < length; i++) {
      const r = returns[Math.floor(random() * n)];
      path[i] = r;
      sum += r;
      equity *= 1 + r;
      if (i + 1 === checkpoints[c]) {
        atCheckpoint[c][p] = equity;
        c++;
      }
    }
    drawdowns[p] = maxDrawdown(path);
    finals[p] = equity - 1;
    means[p] = sum / length;
  }

  drawdowns.sort();
  finals.sort();
  means.sort();

  let ruined = 0;
  let lost = 0;
  for (let p = 0; p < paths; p++) {
    if (drawdowns[p] >= options.ruinDrawdown) ruined++;
    if (finals[p] < 0) lost++;
  }

  const fan: FanPoint[] = [{ trade: 0, p5: 1, p25: 1, p50: 1, p75: 1, p95: 1 }];
  checkpoints.forEach((trade, i) => {
    const sorted = atCheckpoint[i].sort();
    fan.push({
      trade,
      p5: percentileSorted(sorted, 0.05),
      p25: percentileSorted(sorted, 0.25),
      p50: percentileSorted(sorted, 0.5),
      p75: percentileSorted(sorted, 0.75),
      p95: percentileSorted(sorted, 0.95),
    });
  });

  const top = Math.max(drawdowns[paths - 1], 0.01);
  const width = top / HISTOGRAM_BINS;
  const drawdownHistogram = Array.from({ length: HISTOGRAM_BINS }, (_, i) => ({
    from: i * width,
    to: (i + 1) * width,
    count: 0,
  }));
  for (const dd of drawdowns) {
    drawdownHistogram[Math.min(HISTOGRAM_BINS - 1, Math.floor(dd / width))].count++;
  }

  return {
    paths,
    drawdown: {
      p50: percentileSorted(drawdowns, 0.5),
      p95: percentileSorted(drawdowns, 0.95),
      p99: percentileSorted(drawdowns, 0.99),
    },
    finalReturn: {
      p5: percentileSorted(finals, 0.05),
      p50: percentileSorted(finals, 0.5),
      p95: percentileSorted(finals, 0.95),
    },
    meanReturnCi: [percentileSorted(means, 0.025), percentileSorted(means, 0.975)],
    probLoss: lost / paths,
    probRuin: ruined / paths,
    fan,
    drawdownHistogram,
  };
}
