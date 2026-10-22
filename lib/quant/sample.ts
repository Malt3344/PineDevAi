import { analyzeStudy, type ProtocolInput, type RunInput, type StudyAnalysis } from "./analysis";
import { seededRandom } from "./montecarlo";
import { DEFAULT_CRITERIA, DEFAULT_HYPOTHESIS } from "./protocol";
import type { Trade } from "./trades";

/**
 * Two illustrative studies, run through the real engine — what the landing
 * page and the methodology page show. Synthetic trades, generated from a
 * fixed seed, so the numbers are stable and honest about what they are:
 * the same code a user's upload goes through, on made-up data.
 */
function trades(
  seed: number,
  n: number,
  winRate: number,
  avgWin: number,
  avgLoss: number,
  from: string,
  to: string,
): Trade[] {
  const random = seededRandom(seed);
  const start = new Date(from).getTime();
  const span = new Date(to).getTime() - start;
  return Array.from({ length: n }, (_, i) => {
    const win = random() < winRate;
    const size = 0.4 + random() * 1.2;
    return {
      e: null,
      t: new Date(start + (span * (i + 1)) / (n + 1)).toISOString(),
      d: random() < 0.5 ? "long" : "short",
      p: Math.round((win ? avgWin : -avgLoss) * size),
      v: 20000,
    };
  });
}

const run = (id: string, stage: RunInput["stage"], t: Trade[]): RunInput => ({
  id,
  stage,
  label: id,
  fileName: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  trades: t,
});

export type SampleStudy = { title: string; market: string; protocol: ProtocolInput; analysis: StudyAnalysis };

export function sampleStudies(): SampleStudy[] {
  const base = {
    criteria: DEFAULT_CRITERIA,
    lockedAt: "2026-01-01T00:00:00.000Z",
    amendments: 0,
    oosAttempts: 1,
  };

  const robustProtocol: ProtocolInput = {
    ...base,
    inSampleAttempts: 2,
    hypothesis: { ...DEFAULT_HYPOTHESIS, market: "ES1!", timeframe: "15m", accountSize: 25000, costBps: 2, priorTrials: 3 },
  };
  const robust = analyzeStudy(
    robustProtocol,
    [
      run("is", "in_sample", trades(11, 420, 0.47, 190, 120, "2017-01-01", "2022-12-31")),
      run("oos", "out_of_sample", trades(23, 160, 0.45, 175, 125, "2023-01-01", "2025-06-30")),
    ],
    true,
  );

  const overfitProtocol: ProtocolInput = {
    ...base,
    inSampleAttempts: 14,
    amendments: 2,
    hypothesis: { ...DEFAULT_HYPOTHESIS, market: "BTCUSDT", timeframe: "1h", accountSize: 10000, costBps: 12, priorTrials: 40 },
  };
  const overfit = analyzeStudy(
    overfitProtocol,
    [
      run("is", "in_sample", trades(5, 140, 0.56, 160, 150, "2021-01-01", "2023-12-31")),
      run("oos", "out_of_sample", trades(9, 60, 0.45, 150, 160, "2024-01-01", "2025-06-30")),
    ],
    true,
  );

  return [
    { title: "Opening-range breakout", market: "ES1! · 15m", protocol: robustProtocol, analysis: robust },
    { title: "RSI + MACD + Bollinger combo", market: "BTCUSDT · 1h", protocol: overfitProtocol, analysis: overfit },
  ];
}
