import { describe, it, expect } from "vitest";
import { parseNumber, parseTradeList, type Trade } from "@/lib/quant/trades";
import {
  computeMetrics,
  deflatedSharpe,
  expectedMaxSharpe,
  maxDrawdown,
  normCdf,
  normInv,
  probabilisticSharpe,
} from "@/lib/quant/stats";
import { bootstrap } from "@/lib/quant/montecarlo";
import { analyzeStudy, type ProtocolInput, type RunInput } from "@/lib/quant/analysis";
import {
  DEFAULT_CRITERIA,
  DEFAULT_HYPOTHESIS,
  lockBlockers,
  tradesOutsideWindow,
} from "@/lib/quant/protocol";
import { lintPineScript } from "@/lib/quant/pine-lint";

const TV_EXPORT = `Trade #,Type,Date/Time,Signal,Price USD,Position size (qty),Position size (value),Net P&L USD,Net P&L %,Run-up USD,Run-up %,Drawdown USD,Drawdown %,Cumulative P&L USD,Cumulative P&L %
1,Entry long,2024-01-02 09:30,Long,100,10,1000,50,5,60,6,−10,−1,50,0.5
1,Exit long,2024-01-02 15:00,TP,105,10,1000,50,5,60,6,−10,−1,50,0.5
2,Entry short,2024-01-03 09:30,Short,105,10,1050,−"20",−2,5,0.5,−25,−2.5,30,0.3
2,Exit short,2024-01-03 12:00,SL,107,10,1050,−20,−2,5,0.5,−25,−2.5,30,0.3
3,Entry long,2024-01-04 09:30,Long,107,10,1070,0,0,0,0,0,0,30,0.3
3,Exit long,2024-01-04 16:00,Open,107,10,1070,0,0,0,0,0,0,30,0.3`;

/** Deterministic synthetic trades: a small positive edge with noise. */
function syntheticTrades(n: number, edge: number, seed = 1, startYear = 2018): Trade[] {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const start = Date.UTC(startYear, 0, 1);
  const span = 4 * 365 * 24 * 3600 * 1000;
  return Array.from({ length: n }, (_, i) => ({
    e: null,
    t: new Date(start + (span * (i + 1)) / n).toISOString(),
    d: i % 2 ? "short" : "long",
    p: (rand() < 0.5 + edge ? 1 : -1) * (50 + rand() * 100),
    v: 10000,
  }));
}

describe("trade list parsing", () => {
  it("reads TradingView's two-row export, including unicode minus signs, and skips open trades", () => {
    const result = parseTradeList(TV_EXPORT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.format).toBe("tradingview");
    expect(result.trades).toHaveLength(2);
    expect(result.skipped).toBe(1);
    expect(result.trades[0]).toMatchObject({ d: "long", p: 50, v: 1000 });
    expect(result.trades[1]).toMatchObject({ d: "short", p: -20 });
    expect(result.trades[0].t).toBe("2024-01-02T15:00:00.000Z");
  });

  it("reads a generic one-row-per-trade CSV", () => {
    const result = parseTradeList("date;pnl;side\n2024-02-01;12,5;sell\n2024-01-01;-3;buy\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.format).toBe("generic");
    expect(result.trades.map((t) => t.p)).toEqual([-3, 12.5]);
    expect(result.trades[1].d).toBe("short");
  });

  it("explains what it needs when the columns are not there", () => {
    const result = parseTradeList("foo,bar\n1,2");
    expect(result.ok).toBe(false);
  });

  it("normalises the number formats exports actually use", () => {
    expect(parseNumber("−1,234.50")).toBe(-1234.5);
    expect(parseNumber("1.234,50")).toBe(1234.5);
    expect(parseNumber("(250)")).toBe(-250);
    expect(parseNumber("12.5 %")).toBe(12.5);
    expect(parseNumber("abc")).toBeNull();
  });
});

describe("statistics", () => {
  it("has a normal CDF and inverse that agree", () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 6);
    expect(normCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normInv(0.975)).toBeCloseTo(1.96, 2);
    expect(normCdf(normInv(0.3))).toBeCloseTo(0.3, 5);
  });

  it("measures drawdown on the compounded curve", () => {
    expect(maxDrawdown([0.1, -0.5, 0.2])).toBeCloseTo(0.5, 6);
    expect(maxDrawdown([0.1, 0.1])).toBe(0);
  });

  it("gives more confidence to the same Sharpe on more trades", () => {
    const few = probabilisticSharpe(0.15, 30, 0, 3);
    const many = probabilisticSharpe(0.15, 400, 0, 3);
    expect(many).toBeGreaterThan(few);
    expect(many).toBeGreaterThan(0.99);
  });

  it("raises the bar with every trial, and deflates the Sharpe accordingly", () => {
    expect(expectedMaxSharpe(1, 0.01)).toBe(0);
    expect(expectedMaxSharpe(100, 0.01)).toBeGreaterThan(expectedMaxSharpe(10, 0.01));
    const one = deflatedSharpe(0.1, 200, 0, 3, 1, 1 / 199).dsr;
    const hundred = deflatedSharpe(0.1, 200, 0, 3, 100, 1 / 199).dsr;
    expect(hundred).toBeLessThan(one);
  });

  it("computes the headline metrics", () => {
    const trades: Trade[] = [
      { e: null, t: "2024-01-01T00:00:00.000Z", d: "long", p: 100, v: null },
      { e: null, t: "2024-06-01T00:00:00.000Z", d: "long", p: -50, v: null },
      { e: null, t: "2025-01-01T00:00:00.000Z", d: "short", p: 150, v: null },
    ];
    const m = computeMetrics(trades, 1000);
    expect(m.trades).toBe(3);
    expect(m.profitFactor).toBeCloseTo(5, 6);
    expect(m.netPnl).toBe(200);
    expect(m.winRate).toBeCloseTo(2 / 3, 6);
    expect(m.byYear.map((y) => y.year)).toEqual([2024, 2025]);
    expect(m.short.netPnl).toBe(150);
  });
});

describe("monte carlo", () => {
  it("is reproducible for the same data", () => {
    const returns = syntheticTrades(200, 0.05).map((t) => t.p / 10000);
    const a = bootstrap(returns, { paths: 500, ruinDrawdown: 0.2 });
    const b = bootstrap(returns, { paths: 500, ruinDrawdown: 0.2 });
    expect(a.drawdown).toEqual(b.drawdown);
    expect(a.drawdown.p95).toBeGreaterThanOrEqual(a.drawdown.p50);
    expect(a.fan[a.fan.length - 1].trade).toBe(200);
    expect(a.drawdownHistogram.reduce((s, b) => s + b.count, 0)).toBe(500);
  });
});

describe("protocol", () => {
  it("refuses to lock an incomplete or overlapping hypothesis", () => {
    expect(lockBlockers(DEFAULT_HYPOTHESIS).length).toBeGreaterThan(3);
    const overlapping = {
      ...DEFAULT_HYPOTHESIS,
      market: "NQ",
      timeframe: "5m",
      rationale: "x".repeat(80),
      entryRules: "a",
      exitRules: "b",
      inSampleStart: "2018-01-01",
      inSampleEnd: "2022-01-01",
      outOfSampleStart: "2021-01-01",
      outOfSampleEnd: "2023-01-01",
    };
    expect(lockBlockers(overlapping).join(" ")).toMatch(/overlap/);
    expect(lockBlockers({ ...overlapping, outOfSampleStart: "2022-01-02" })).toEqual([]);
  });

  it("measures how much of a run leaks outside its window", () => {
    expect(
      tradesOutsideWindow(["2020-01-01T00:00:00Z", "2023-06-01T00:00:00Z"], "2019-01-01", "2021-01-01"),
    ).toBe(0.5);
  });

  it("lints the backtest-lying patterns out of a script", () => {
    const bad = lintPineScript(
      '//@version=6\nstrategy("x")\nh = request.security(syminfo.tickerid, "D", high, lookahead = barmerge.lookahead_on)',
    );
    expect(bad.find((r) => r.id === "lookahead")?.status).toBe("fail");
    expect(bad.find((r) => r.id === "commission")?.status).toBe("fail");
    const good = lintPineScript(
      '//@version=6\nstrategy("x", commission_value = 0.05, slippage = 1, default_qty_type = strategy.percent_of_equity)\nfrom = input.time(timestamp("2018-01-01"))',
    );
    expect(good.every((r) => r.status === "pass")).toBe(true);
  });
});

describe("study analysis", () => {
  const protocol: ProtocolInput = {
    hypothesis: { ...DEFAULT_HYPOTHESIS, accountSize: 10000, costBps: 2 },
    criteria: DEFAULT_CRITERIA,
    lockedAt: "2025-01-01T00:00:00.000Z",
    amendments: 0,
    inSampleAttempts: 1,
    oosAttempts: 1,
  };
  const run = (id: string, stage: RunInput["stage"], trades: Trade[], at = "2025-01-02"): RunInput => ({
    id,
    stage,
    label: id,
    fileName: null,
    createdAt: `${at}T00:00:00.000Z`,
    trades,
  });

  it("walks the stages in order and stays incomplete until out-of-sample exists", () => {
    const empty = analyzeStudy({ ...protocol, lockedAt: null }, [], false);
    expect(empty.current).toBe("hypothesis");
    expect(empty.verdict.grade).toBe("incomplete");

    const withIs = analyzeStudy(protocol, [run("is", "in_sample", syntheticTrades(300, 0.12))], true);
    expect(withIs.current).toBe("out_of_sample");
    expect(withIs.stageStates.robustness).toBe("done");
    expect(withIs.robustness?.costStress).toHaveLength(3);

    const withOos = analyzeStudy(
      protocol,
      [run("is", "in_sample", syntheticTrades(300, 0.12)), run("oos", "out_of_sample", syntheticTrades(100, 0.12, 4, 2022))],
      true,
    );
    expect(withOos.current).toBe("verdict");
  });

  it("validates a strong edge and rejects noise", () => {
    const strong = analyzeStudy(
      protocol,
      [
        run("is", "in_sample", syntheticTrades(400, 0.15, 7)),
        run("oos", "out_of_sample", syntheticTrades(150, 0.15, 11, 2022)),
      ],
      true,
    );
    expect(strong.checks.find((c) => c.id === "dsr")?.status).toBe("pass");
    expect(["validated", "promising"]).toContain(strong.verdict.grade);

    const noise = analyzeStudy(
      protocol,
      [
        run("is", "in_sample", syntheticTrades(400, -0.02, 3)),
        run("oos", "out_of_sample", syntheticTrades(150, -0.02, 5, 2022)),
      ],
      true,
    );
    expect(noise.verdict.grade).toBe("rejected");
  });

  it("counts every in-sample re-run as a trial and penalises reused out-of-sample data", () => {
    const runs = [
      run("a", "in_sample", syntheticTrades(300, 0.1, 1), "2025-01-01"),
      run("b", "in_sample", syntheticTrades(300, 0.1, 2), "2025-01-02"),
      run("c", "in_sample", syntheticTrades(300, 0.1, 3), "2025-01-03"),
    ];
    const analysis = analyzeStudy({ ...protocol, oosAttempts: 2 }, runs, true);
    expect(analysis.trials).toBe(3);
    expect(analysis.inSample?.id).toBe("c");
    expect(analysis.verdict.flags.join(" ")).toMatch(/contaminated/);
  });

  it("does not hand a trial back when an in-sample run is deleted", () => {
    const analysis = analyzeStudy(
      { ...protocol, inSampleAttempts: 5 },
      [run("a", "in_sample", syntheticTrades(300, 0.1, 1))],
      true,
    );
    expect(analysis.trials).toBe(5);
  });
});
