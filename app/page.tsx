import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock,
  Dices,
  FileCode,
  Lock,
  Radar,
  Scale,
  Shuffle,
  Sigma,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { SampleVerdicts } from "@/components/landing/SampleVerdicts";
import { SiteFooter, SiteHeader } from "@/components/landing/SiteChrome";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { STAGES } from "@/lib/quant/protocol";
import { sampleStudies } from "@/lib/quant/sample";
import { PLANS, FAQ } from "@/lib/pricing";
import { startCheckoutAction } from "@/app/chat/account/billing/actions";
import { WaitlistForm } from "@/components/WaitlistForm";

const PROBLEMS = [
  {
    icon: Dices,
    title: "You tried 40 versions",
    body: "Tweak the RSI length, the stop, the session filter, and one combination will look great on any data — including random data. A backtest never tells you how many attempts it took.",
  },
  {
    icon: Shuffle,
    title: "The drawdown was lucky",
    body: "Your backtest's worst stretch is one ordering of the trades. Reshuffle them and the drawdown is often twice as deep. That is the one you will size into.",
  },
  {
    icon: TrendingDown,
    title: "The fills were free",
    body: "A thin edge disappears the moment slippage is realistic. If doubling costs turns the equity curve red, the edge was never wider than the spread.",
  },
];

const TESTS = [
  {
    icon: Lock,
    title: "Pre-registration",
    body: "Hypothesis, data split and pass criteria are locked before the first backtest. Amending is allowed — and counted.",
  },
  {
    icon: Sigma,
    title: "Deflated Sharpe ratio",
    body: "The probability your Sharpe beats the best of N strategies with no edge, where N is every variant you uploaded. Re-running makes it harder, not easier.",
  },
  {
    icon: Shuffle,
    title: "Monte Carlo drawdown",
    body: "Thousands of bootstrapped trade histories give the drawdown you should plan for, and the odds of hitting your own pain limit.",
  },
  {
    icon: Scale,
    title: "Cost and outlier stress",
    body: "The same trades at double and triple costs, and with the best 5% removed. Real edges survive both.",
  },
  {
    icon: Radar,
    title: "One-shot out-of-sample",
    body: "Held-out data, opened once. Efficiency against in-sample, and drawdown against the simulated band. A second look is recorded.",
  },
  {
    icon: FileCode,
    title: "Pine v6, built for testing",
    body: "The research assistant writes the strategy with costs, a date window and no lookahead, then lints it for the ways backtests lie.",
  },
];

const [standardPlan, proPlan] = PLANS;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-center text-sm font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </h2>
  );
}

export default function Home() {
  const samples = sampleStudies();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto flex max-w-6xl flex-col items-center px-6 pt-16 pb-16 text-center sm:pt-20">
          <Badge variant="secondary" className="mb-4">
            A research protocol for retail traders
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Validate your strategy
            <br />
            the way quants do.
          </h1>
          <p className="mt-4 max-w-2xl text-balance text-base text-muted-foreground">
            Most backtests are lucky. PineDev takes a trading idea through the same seven-stage
            protocol systematic funds use — pre-registration, deflated Sharpe, Monte Carlo, cost
            stress and a one-shot out-of-sample test — and tells you plainly whether it holds up
            before your money finds out.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link href="/login?mode=sign-up">
                Validate a strategy
                <ArrowRight />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/methodology">Read the methodology</Link>
            </Button>
          </div>

          <div className="mt-12 w-full">
            <SampleVerdicts studies={samples} />
            <p className="mt-3 text-xs text-muted-foreground">
              Two example studies, computed by the same engine your uploads go through. The one on
              the right had the better backtest.
            </p>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <SectionLabel>The problem</SectionLabel>
            <h2 className="mt-3 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              Why a good backtest loses money live
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {PROBLEMS.map((item) => (
                <Card key={item.title}>
                  <CardHeader>
                    <item.icon className="size-5 text-destructive" />
                    <CardTitle className="mt-2 text-base font-medium">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="protocol" className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <SectionLabel>The protocol</SectionLabel>
            <h2 className="mt-3 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              Seven stages, in order, no skipping
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted-foreground">
              Each stage unlocks the next. The order is the discipline: you commit to what you
              believe before the data can talk you into something else.
            </p>
            <ol className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {STAGES.map((stage, i) => (
                <li key={stage.id} className="flex gap-4">
                  <span className="font-mono text-sm text-primary">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="text-base font-medium">{stage.label}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{stage.short}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <SectionLabel>What gets measured</SectionLabel>
            <h2 className="mt-3 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              The tests a fund would run, on your TradingView trades
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted-foreground">
              Export the list of trades from TradingView&apos;s Strategy Tester and upload it. Every
              number is computed from your trades, and every formula is documented.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {TESTS.map((feature) => (
                <Card key={feature.title}>
                  <CardHeader>
                    <feature.icon className="size-5 text-primary" />
                    <CardTitle className="mt-2 text-base font-medium">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto grid max-w-5xl gap-10 px-6 py-20 md:grid-cols-2 md:items-center">
            <div>
              <SectionLabel>Works inside your Claude</SectionLabel>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Connect your own Claude. Just talk to it.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Add PineDev to Claude — the desktop app, claude.ai or Claude Code — log in once, and
                Claude runs the whole protocol on your own Claude plan. It interviews you for the
                hypothesis, writes the Pine v6 strategy, tells you which dates to backtest, and reads
                the TradingView export you drop into the chat. It argues with you instead of agreeing:
                it will tell you when a strategy is not worth trading, and it will not tune on the
                sealed data.
              </p>
              <ol className="mt-5 space-y-2 text-sm">
                {[
                  "Add the PineDev connector (or the Claude Code plugin)",
                  "Log in to PineDev and press Allow",
                  "Ask: “Validate my opening-range breakout on NQ”",
                ].map((step, i) => (
                  <li key={step} className="flex gap-3">
                    <span className="font-mono text-primary">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="space-y-3 rounded-xl border border-border bg-surface-raised p-4 text-sm">
              <div className="ml-auto max-w-[85%] rounded-lg bg-secondary px-3 py-2">
                The OOS profit factor was 0.9. If I change the stop to 1.5 ATR it&apos;s 1.4 — can we use that?
              </div>
              <div className="flex max-w-[92%] gap-2">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-muted-foreground">
                  No — that 1.4 was found by looking at the out-of-sample data, so it is now
                  in-sample. The honest result is the 0.9. If you believe the wider stop is better
                  for a reason you can state, amend the hypothesis and test it on fresh data; it will
                  count as another trial.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <SectionLabel>Pricing</SectionLabel>
            <h2 className="mt-3 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              Cheaper than one bad trade
            </h2>
            <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
              <Card className="border-primary/40">
                <CardHeader>
                  <CardTitle className="text-base font-medium text-primary">{standardPlan.name}</CardTitle>
                  <p className="text-3xl font-semibold">
                    ${standardPlan.price}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2.5 text-sm">
                    {standardPlan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <form action={startCheckoutAction}>
                    <Button type="submit" className="w-full">
                      Get started
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base font-medium text-muted-foreground">{proPlan.name}</CardTitle>
                  <Badge variant="secondary">
                    <Clock className="size-3" />
                    Coming soon
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-3xl font-semibold text-muted-foreground">
                    ${proPlan.price}
                    <span className="text-sm font-normal">/mo</span>
                  </p>
                  <ul className="space-y-2.5 text-sm">
                    {proPlan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-border pt-4">
                    <p className="mb-3 text-xs text-muted-foreground">
                      Not available yet. Join the waitlist and we&apos;ll email you when it&apos;s ready.
                    </p>
                    <WaitlistForm />
                  </div>
                </CardContent>
              </Card>
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link href="/pricing" className="underline underline-offset-4 hover:text-foreground">
                Full pricing details
              </Link>
            </p>
          </div>
        </section>

        <section id="faq" className="border-t border-border">
          <div className="mx-auto max-w-2xl px-6 py-20">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="mt-3 text-center text-2xl font-semibold tracking-tight sm:text-3xl">Questions</h2>
            <Accordion type="single" collapsible className="mt-10">
              {FAQ.map((item) => (
                <AccordionItem key={item.question} value={item.question}>
                  <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-20 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Find out before the market tells you.
            </h2>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              Take your best idea through the protocol. If it survives, you will know why. If it
              does not, you just kept the money.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/login?mode=sign-up">
                Start a study
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
