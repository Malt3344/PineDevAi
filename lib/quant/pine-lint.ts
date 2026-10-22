export type LintResult = {
  id: string;
  label: string;
  detail: string;
  status: "pass" | "fail" | "warn";
};

/**
 * Static checks for the things that make a Pine backtest lie. None of these
 * need the script to run: they read it. Each one maps to a way a backtest
 * looks better than the strategy could ever trade.
 */
export function lintPineScript(code: string): LintResult[] {
  const src = code.replace(/\/\/(?!@version).*$/gm, "");
  const isStrategy = /\bstrategy\s*\(/.test(src);

  const results: LintResult[] = [
    {
      id: "version",
      label: "Pine v6",
      detail: "The script declares //@version=6.",
      status: /\/\/@version\s*=\s*6\b/.test(code) ? "pass" : "fail",
    },
    {
      id: "strategy",
      label: "Is a strategy",
      detail: "Only strategy() scripts produce a trade list. An indicator cannot be backtested.",
      status: isStrategy ? "pass" : "fail",
    },
    {
      id: "commission",
      label: "Commission charged",
      detail: "strategy() sets commission_value. A backtest without costs overstates every edge.",
      status: /commission_value\s*=/.test(src) ? "pass" : "fail",
    },
    {
      id: "slippage",
      label: "Slippage charged",
      detail: "strategy() sets slippage, in ticks. Market orders never fill at the exact close.",
      status: /slippage\s*=/.test(src) ? "pass" : "warn",
    },
    {
      id: "window",
      label: "Date window input",
      detail:
        "input.time() inputs gate entries to a window, so in-sample and out-of-sample can be run separately from the same script.",
      status: /input\.time\s*\(/.test(src) ? "pass" : "fail",
    },
    {
      id: "lookahead",
      label: "No lookahead",
      detail:
        "barmerge.lookahead_on lets a higher-timeframe value see the future on historical bars. It makes backtests unrepeatable live.",
      status: /lookahead_on/.test(src) ? "fail" : "pass",
    },
    {
      id: "sizing",
      label: "Explicit position sizing",
      detail: "default_qty_type is set, so returns are not an artefact of the default one-contract size.",
      status: /default_qty_type\s*=/.test(src) ? "pass" : "warn",
    },
  ];

  if (/calc_on_every_tick\s*=\s*true/.test(src)) {
    results.push({
      id: "every_tick",
      label: "Tick-level recalculation",
      detail:
        "calc_on_every_tick = true behaves differently live than on historical bars, which only have OHLC. Backtest and live results will not match.",
      status: "warn",
    });
  }

  return results;
}
