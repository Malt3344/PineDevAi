/**
 * The single source of truth for pricing copy on the landing page.
 */
export const PLAN = {
  name: "PineDev",
  price: 39,
  features: [
    "Unlimited strategy validations",
    "Works inside your own Claude — desktop app, claude.ai or Claude Code",
    "Pre-registered hypothesis, locked before any results",
    "Deflated Sharpe, Monte Carlo drawdown, cost and outlier stress",
    "One-shot out-of-sample test and an honest verdict",
    "Incubation tracking once you go live",
  ],
} as const;

export const FAQ = [
  {
    question: "What do I need?",
    answer:
      "A paid Claude plan (Pro or Max) and a free TradingView account. You connect your Claude to PineDev once; Claude does the work on your own Claude plan.",
  },
  {
    question: "Does PineDev run my backtest?",
    answer:
      "No — TradingView does. Claude writes the Pine Script v6 strategy and tells you which dates to test. You run it in TradingView's Strategy Tester, export the list of trades, and give the file to Claude. Every statistic is computed from those trades.",
  },
  {
    question: "What makes this different from a normal backtest?",
    answer:
      "A backtest shows what one run did. PineDev asks whether it is real: how many variants you tried (deflated Sharpe), how bad the drawdown could plausibly get (Monte Carlo), whether it survives worse fills, and whether it holds on data it has never seen — tested once.",
  },
  {
    question: "Is a validated strategy guaranteed to make money?",
    answer:
      "No. It means the strategy passed tests you committed to in advance, on the data you had. That is why the last step is trading it small and checking live results against the range the backtest predicts. Nothing here is financial advice.",
  },
] as const;
