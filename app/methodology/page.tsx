import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/landing/SiteChrome";
import { Button } from "@/components/ui/button";
import { DEFAULT_CRITERIA, STAGES } from "@/lib/quant/protocol";

export const metadata: Metadata = {
  title: "Methodology — PineDev",
  description:
    "How PineDev validates a trading strategy: pre-registration, deflated Sharpe ratio, bootstrap Monte Carlo, cost and outlier stress, one-shot out-of-sample testing and incubation.",
};

type Test = {
  name: string;
  stage: string;
  what: string;
  how: React.ReactNode;
  threshold: string;
};

const c = DEFAULT_CRITERIA;

const TESTS: Test[] = [
  {
    name: "Sample size",
    stage: "In-sample",
    what: "Whether there are enough trades for any other statistic to mean something.",
    how: "Closed trades in the latest in-sample run. Open positions are ignored: their P&L is not final.",
    threshold: `≥ ${c.minTrades} trades · critical`,
  },
  {
    name: "Profit factor",
    stage: "In-sample",
    what: "Gross profit divided by gross loss, after the costs the backtest charged.",
    how: <code>Σ winning P&L ÷ |Σ losing P&L|</code>,
    threshold: `≥ ${c.minProfitFactor}`,
  },
  {
    name: "Deflated Sharpe ratio",
    stage: "Stress test",
    what: "The probability the strategy's Sharpe ratio is real, after accounting for how many variants were tried, how many trades it rests on, and how skewed and fat-tailed its returns are.",
    how: (
      <>
        Per-trade returns are P&L ÷ equity before the trade. The Sharpe ratio SR is their mean ÷
        standard deviation. The benchmark SR₀ is the expected maximum Sharpe of N trials with no
        edge: <code>SR₀ = √V · ((1−γ)·Φ⁻¹(1−1/N) + γ·Φ⁻¹(1−1/(N·e)))</code>, with γ the
        Euler–Mascheroni constant. N counts prior trials you declared, every in-sample upload
        (deleted ones included) and every hypothesis amendment. V is the variance of Sharpe
        estimates across trials: 1/(n−1) when fewer than three runs exist, otherwise the observed
        variance, never below that floor. The deflated Sharpe is{" "}
        <code>Φ((SR − SR₀)·√(n−1) ÷ √(1 − γ₃·SR + (γ₄−1)/4·SR²))</code>, with γ₃ the skewness and γ₄
        the kurtosis of returns.
      </>
    ),
    threshold: `≥ ${(c.minDsr * 100).toFixed(0)}% · critical`,
  },
  {
    name: "Monte Carlo drawdown",
    stage: "Stress test",
    what: "How deep the drawdown could plausibly get, not just how deep it happened to get.",
    how: "2,000 bootstrap paths: each resamples the per-trade returns with replacement to the same number of trades and compounds them. The 95th percentile of the paths' maximum drawdowns is compared with your stated tolerance. The generator is seeded from the trades, so the same upload always gives the same numbers.",
    threshold: `95th percentile ≤ ${c.maxDrawdownPct}%`,
  },
  {
    name: "Cost stress",
    stage: "Stress test",
    what: "Whether the edge survives worse execution than the backtest assumed.",
    how: "Each trade is charged your stated round-trip cost again (doubled costs) and twice again (tripled), as basis points of the position's value when the export includes it, otherwise of the equity at entry.",
    threshold: "Net P&L > 0 at doubled costs",
  },
  {
    name: "Outlier dependence",
    stage: "Stress test",
    what: "Whether the result rests on a handful of trades that may never repeat.",
    how: "The best 5% of trades by P&L (at least one) are removed and net P&L is recomputed.",
    threshold: "Net P&L > 0",
  },
  {
    name: "Consistency",
    stage: "Stress test",
    what: "Whether the strategy works across market conditions, or averages one good regime with several bad ones.",
    how: "Net P&L per calendar year when the run spans three years or more, per quarter otherwise.",
    threshold: `≥ ${c.minProfitablePeriodsPct}% of periods profitable`,
  },
  {
    name: "Out-of-sample profit factor",
    stage: "Out-of-sample",
    what: "Performance on data that played no part in developing the strategy.",
    how: "The same profit factor, on the out-of-sample run. The first upload is the test; later uploads are recorded and lower the verdict by one grade.",
    threshold: `≥ ${c.minOosProfitFactor} · critical`,
  },
  {
    name: "Out-of-sample efficiency",
    stage: "Out-of-sample",
    what: "How much of the in-sample risk-adjusted performance survives on new data. Some decay is normal.",
    how: <code>per-trade Sharpe (out-of-sample) ÷ per-trade Sharpe (in-sample)</code>,
    threshold: `≥ ${(c.minOosEfficiency * 100).toFixed(0)}%`,
  },
  {
    name: "Out-of-sample drawdown",
    stage: "Out-of-sample",
    what: "Whether the held-out drawdown is something the in-sample trades predicted.",
    how: "The out-of-sample maximum drawdown against the in-sample Monte Carlo 95th percentile.",
    threshold: "Inside the band",
  },
];

const GRADES = [
  ["Validated", "Every criterion passed. Incubate at small size."],
  ["Promising", "Critical tests passed, one other failed. Incubate at reduced size."],
  ["Fragile", "Two or three non-critical tests failed. The edge may be real, but it is not robust."],
  ["Rejected", "A critical test failed, or four or more tests did. Do not trade it."],
] as const;

/** Public, citable description of exactly what the engine computes. */
export default function MethodologyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 px-6 py-16">
        <article className="mx-auto max-w-3xl">
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Methodology</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance">
            How a strategy earns a verdict
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            A backtest answers one question: what would these rules have done on this data? The
            protocol asks the questions that matter before you trade it. Is the result bigger than
            luck, given how many things you tried? How bad could it plausibly get? Does it survive
            worse fills? Does it work on data it has never seen? This page documents exactly how
            each answer is computed.
          </p>

          <h2 className="mt-14 text-xl font-semibold tracking-tight">The stages</h2>
          <ol className="mt-6 space-y-5">
            {STAGES.map((stage, i) => (
              <li key={stage.id} className="flex gap-4">
                <span className="font-mono text-sm text-primary">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="font-medium">{stage.label}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{stage.short}</p>
                </div>
              </li>
            ))}
          </ol>

          <h2 className="mt-14 text-xl font-semibold tracking-tight">Why pre-registration comes first</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The most common way a backtest lies is not a bug — it is the person running it. Look at
            enough variants and you will find one that fits the past. So the hypothesis, the date
            split and every pass criterion are written down and locked before any result is
            uploaded. Unlocking is possible; it is recorded, and each amendment counts as another
            trial against the deflated Sharpe. The out-of-sample window stays sealed until the
            in-sample work is finished, and is only meaningful the first time it is opened.
          </p>

          <h2 className="mt-14 text-xl font-semibold tracking-tight">The tests</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Thresholds shown are the defaults. Each study can set its own before locking.
          </p>
          <div className="mt-6 space-y-4">
            {TESTS.map((test) => (
              <section key={test.name} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-medium">{test.name}</h3>
                  <span className="text-xs text-muted-foreground">{test.stage}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed">{test.what}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.8125rem] [&_code]:text-foreground">
                  {test.how}
                </p>
                <p className="mt-3 font-mono text-xs text-primary">{test.threshold}</p>
              </section>
            ))}
          </div>

          <h2 className="mt-14 text-xl font-semibold tracking-tight">Grades</h2>
          <dl className="mt-6 divide-y divide-border rounded-xl border border-border">
            {GRADES.map(([grade, meaning]) => (
              <div key={grade} className="grid gap-1 px-5 py-3 sm:grid-cols-[8rem_1fr]">
                <dt className="text-sm font-medium">{grade}</dt>
                <dd className="text-sm text-muted-foreground">{meaning}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm text-muted-foreground">
            Reusing out-of-sample data lowers the grade by one level.
          </p>

          <h2 className="mt-14 text-xl font-semibold tracking-tight">Incubation</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            A verdict is about the past. Forward trades — paper or small size — are uploaded in
            batches and plotted against a fresh bootstrap of the in-sample trades of the same
            length. A study is <em>on track</em> inside the 5–95% band, <em>below band</em> when
            cumulative return falls under the 5th percentile, and <em>broken</em> when its drawdown
            exceeds the in-sample 95th-percentile drawdown.
          </p>

          <h2 className="mt-14 text-xl font-semibold tracking-tight">What this does not do</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>It does not run Pine Script. Backtests run in TradingView; PineDev analyses the trades they produce.</li>
            <li>It cannot detect every form of lookahead. The Build stage lints for the common ones; the rest is on the script.</li>
            <li>Bootstrapping assumes trades are independent. Strategies with strongly clustered outcomes will have wider real-world ranges than shown.</li>
            <li>It is not financial advice, and a validated strategy can still lose money.</li>
          </ul>

          <h2 className="mt-14 text-xl font-semibold tracking-tight">References</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Bailey, D. H. &amp; López de Prado, M. (2012). The Sharpe Ratio Efficient Frontier. <em>Journal of Risk</em>, 15(2).</li>
            <li>Bailey, D. H. &amp; López de Prado, M. (2014). The Deflated Sharpe Ratio: Correcting for Selection Bias, Backtest Overfitting and Non-Normality. <em>Journal of Portfolio Management</em>, 40(5).</li>
            <li>Harvey, C. R. &amp; Liu, Y. (2015). Backtesting. <em>Journal of Portfolio Management</em>, 42(1).</li>
            <li>Pardo, R. (2008). <em>The Evaluation and Optimization of Trading Strategies</em>, 2nd ed. Wiley.</li>
            <li>Efron, B. &amp; Tibshirani, R. (1993). <em>An Introduction to the Bootstrap</em>. Chapman &amp; Hall.</li>
          </ul>

          <div className="mt-14 flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/login?mode=sign-up&callbackUrl=${encodeURIComponent("/connect")}`}>
                Connect Claude
                <ArrowRight />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/#pricing">Pricing</Link>
            </Button>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
