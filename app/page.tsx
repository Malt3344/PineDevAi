import Link from "next/link";
import { ArrowRight, Check, FileCode, Plug, ShieldCheck } from "lucide-react";
import { SampleVerdicts } from "@/components/landing/SampleVerdicts";
import { SiteFooter, SiteHeader } from "@/components/landing/SiteChrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { startCheckoutAction } from "@/app/(app)/account/billing/actions";
import { FAQ, PLAN } from "@/lib/pricing";
import { sampleStudies } from "@/lib/quant/sample";

/** Sign-up that lands straight on the Connect Claude page. */
const START_HREF = `/login?mode=sign-up&callbackUrl=${encodeURIComponent("/connect")}`;

const STEPS = [
  {
    icon: Plug,
    title: "Connect your Claude",
    body: "Add PineDev to Claude — desktop app, claude.ai or Claude Code — and log in once. It runs on your own Claude plan.",
  },
  {
    icon: FileCode,
    title: "Describe your idea",
    body: "Claude interviews you, locks your hypothesis before any results exist, and writes the Pine Script v6 strategy for TradingView.",
  },
  {
    icon: ShieldCheck,
    title: "Get a quant's verdict",
    body: "Backtest in TradingView, drop the trade export into Claude. PineDev runs the tests a professional would and tells you honestly if it holds.",
  },
];

const TESTS = [
  ["Pre-registration", "Rules and pass criteria locked before the first backtest."],
  ["Deflated Sharpe ratio", "Is the result bigger than luck, given every variant you tried?"],
  ["Monte Carlo", "How deep the drawdown could plausibly get — not just how deep it got."],
  ["Cost & outlier stress", "Does it survive double costs, and without its best trades?"],
  ["One-shot out-of-sample", "Tested once on data it has never seen."],
  ["Live incubation", "Real trades checked against the range the backtest predicts."],
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-sm font-medium tracking-wide text-muted-foreground uppercase">{children}</p>
  );
}

export default function Home() {
  const samples = sampleStudies();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto flex max-w-6xl flex-col items-center px-6 pt-16 pb-16 text-center sm:pt-24">
          <Badge variant="secondary" className="mb-5">
            For Claude Pro &amp; Max · TradingView Pine Script v6
          </Badge>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Validate your strategy like a quant.
          </h1>
          <p className="mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
            Connect your Claude, describe your idea, and get an honest, professional verdict on
            whether it works — before your money finds out.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href={START_HREF}>
                Connect Claude
                <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link href="#how">How it works</Link>
            </Button>
          </div>

          <div className="mt-16 w-full">
            <SampleVerdicts studies={samples} />
            <p className="mt-3 text-xs text-muted-foreground">
              Two example verdicts. The one on the right had the better backtest — and failed.
            </p>
          </div>
        </section>

        <section id="how" className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <SectionLabel>How it works</SectionLabel>
            <h2 className="mt-3 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              Three steps. Claude does the work.
            </h2>
            <ol className="mt-12 grid gap-6 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-primary">{String(i + 1).padStart(2, "0")}</span>
                    <step.icon className="size-4 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 font-medium">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <SectionLabel>What gets tested</SectionLabel>
            <h2 className="mt-3 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              The checks a professional quant would run
            </h2>
            <dl className="mt-12 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {TESTS.map(([name, what]) => (
                <div key={name} className="flex gap-3">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <dt className="text-sm font-medium">{name}</dt>
                    <dd className="mt-0.5 text-sm text-muted-foreground">{what}</dd>
                  </div>
                </div>
              ))}
            </dl>
            <p className="mt-10 text-center text-sm text-muted-foreground">
              Every formula is documented in the{" "}
              <Link href="/methodology" className="underline underline-offset-4 hover:text-foreground">
                methodology
              </Link>
              .
            </p>
          </div>
        </section>

        <section id="pricing" className="border-t border-border">
          <div className="mx-auto max-w-md px-6 py-20">
            <SectionLabel>Pricing</SectionLabel>
            <div className="mt-8 rounded-xl border border-primary/40 bg-card p-6">
              <p className="text-3xl font-semibold">
                ${PLAN.price}
                <span className="text-sm font-normal text-muted-foreground">/month</span>
              </p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {PLAN.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <form action={startCheckoutAction} className="mt-6">
                <Button type="submit" className="w-full">
                  Get started
                </Button>
              </form>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Requires your own Claude Pro or Max plan. Cancel any time.
              </p>
            </div>
          </div>
        </section>

        <section id="faq" className="border-t border-border">
          <div className="mx-auto max-w-2xl px-6 py-20">
            <SectionLabel>Questions</SectionLabel>
            <Accordion type="single" collapsible className="mt-8">
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
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Find out before the market tells you.</h2>
            <Button className="mt-6" size="lg" asChild>
              <Link href={START_HREF}>
                Connect Claude
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
