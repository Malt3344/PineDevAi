import { DAILY_MESSAGE_CAP, PAID_DAILY_MESSAGE_CAP } from "@/lib/daily-cap";
import { AGENT_MODELS } from "@/lib/agent/models";

/**
 * The single source of truth for pricing copy, read by both /pricing and
 * the landing page's inline pricing preview so the two can never drift —
 * previously the landing page hardcoded "1,000 messages a day" while the
 * real cap in lib/daily-cap.ts was 150; this makes that class of bug
 * impossible by construction.
 */
export const PLANS = [
  {
    id: "standard",
    name: "Standard",
    price: 39,
    status: "live" as const,
    tagline: "The full validation protocol, for every idea you have.",
    features: [
      "Unlimited studies through the seven-stage validation protocol",
      "Pre-registered hypotheses and pass criteria, locked before results",
      "Deflated Sharpe ratio that counts every variant you tried",
      "Monte Carlo drawdown bands, cost stress and outlier removal",
      "One-shot out-of-sample test with contamination tracking",
      "Incubation tracking against the simulated band",
      "Works inside your own Claude (desktop, claude.ai, Claude Code) — connect once, on your own Claude plan",
      `Built-in research assistant if you don't use Claude — ${PAID_DAILY_MESSAGE_CAP} messages a day, ${AGENT_MODELS.length} models`,
      "Share a study's verdict with a read-only link",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 139,
    status: "coming-soon" as const,
    tagline: "For running more than one strategy at once.",
    features: [
      "Everything in the Standard plan",
      "Portfolio view: correlation between validated strategies",
      "Multi-fold walk-forward analysis",
      "Automatic incubation tracking from TradingView alerts",
      "Access to our best available models",
      "Higher daily limits",
    ],
  },
] as const;

export const FREE_PLAN_DAILY_CAP = DAILY_MESSAGE_CAP;

export const FAQ = [
  {
    question: "Why not just look at TradingView's Strategy Tester?",
    answer:
      "The Strategy Tester tells you what one backtest did. It does not tell you whether that result is luck, whether it survives worse fills, how deep the drawdown could plausibly go, or how many variants you tried before this one looked good. Those are the questions that decide whether a strategy makes money live, and they are what the protocol answers.",
  },
  {
    question: "What is a deflated Sharpe ratio, and why does it go down when I re-run?",
    answer:
      "Try enough parameter combinations on random data and one of them will look great. The deflated Sharpe ratio (Bailey & López de Prado, 2014) is the probability your Sharpe beats the best you would expect from that many tries on noise. Every in-sample upload is counted as a try, so tweaking until it looks good makes the bar higher, not lower.",
  },
  {
    question: "Does PineDev run my backtest?",
    answer:
      "No. Pine Script only runs inside TradingView. The assistant writes the script with a date-window input, you run it in TradingView's Strategy Tester (free on every plan), export the list of trades, and upload it. Every statistic is computed from those trades.",
  },
  {
    question: "Why can I only run the out-of-sample test once?",
    answer:
      "Because a second look is no longer out-of-sample. If you see a bad result, change something and re-test on the same data, you are fitting to it. You can upload again, but it is recorded and lowers the verdict — the same way a fund would treat it.",
  },
  {
    question: "Is a 'Validated' strategy guaranteed to make money?",
    answer:
      "No. Validation means the strategy passed the tests you pre-registered, on the data you had. Markets change. That is why the last stage is incubation — trading it small and checking live results against the range the backtest predicts — and why nothing here is financial advice.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Manage or cancel your subscription anytime from Account → Billing — it's a standard Stripe subscription, so there's no separate cancellation flow to hunt for.",
  },
  {
    question: "Is my strategy private?",
    answer:
      "Every study is private by default. You can make one public to share a read-only link to its verdict, but nothing is shared unless you explicitly do that.",
  },
] as const;
