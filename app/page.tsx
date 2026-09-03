import Link from "next/link";
import { WaitlistForm } from "@/components/WaitlistForm";

// Static example output shown in the "In practice" section — not generated
// at request time, just illustrative markup.
const MOCK_SCRIPT = `//@version=6
strategy("ORB Breakout", overlay=true)

sessionStart = "0930-0935"
inSession = not na(time(timeframe.period, sessionStart))

var float orbHigh = na
var float orbLow = na

if inSession
    orbHigh := high
    orbLow := low
else if not na(orbHigh) and close > orbHigh
    strategy.entry("Long", strategy.long)
else if not na(orbLow) and close < orbLow
    strategy.entry("Short", strategy.short)`;

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-sm font-semibold tracking-tight">PineDev</span>
        <Link href="/login" className="text-sm text-muted transition hover:text-foreground">
          Log in
        </Link>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pt-20 pb-24 text-center sm:pt-28">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Describe your strategy.
            <br />
            Get working Pine Script v6.
          </h1>
          <p className="mt-6 max-w-xl text-balance text-base text-muted sm:text-lg">
            PineDev is an AI agent that writes and fixes TradingView Pine Script for
            you. Paste a compiler error and it ships a corrected script back &mdash;
            no forums, no guesswork.
          </p>
          <div className="mt-10 flex justify-center">
            <WaitlistForm />
          </div>
          <p className="mt-6 text-xs text-muted">
            Pick between multiple Claude models, and save the strategies you
            like to a personal library.
          </p>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <h2 className="text-center text-sm font-medium tracking-wide text-muted uppercase">
              How it works
            </h2>
            <div className="mt-10 grid gap-10 sm:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Describe your strategy",
                  body: "Explain your entries, exits and risk rules in plain language, the way you'd explain it to a colleague.",
                },
                {
                  step: "02",
                  title: "The agent writes Pine v6",
                  body: "PineDev returns a complete, copy-pasteable Pine Script v6 strategy, ready for the TradingView editor.",
                },
                {
                  step: "03",
                  title: "Paste errors, get fixes",
                  body: "Hit a compiler error? Paste it back. PineDev returns the corrected script and explains what was wrong.",
                },
              ].map((item) => (
                <div key={item.step}>
                  <span className="font-mono text-sm text-accent">{item.step}</span>
                  <h3 className="mt-3 text-base font-medium">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-3xl px-6 py-20">
            <h2 className="text-center text-sm font-medium tracking-wide text-muted uppercase">
              In practice
            </h2>
            <div className="mt-10 overflow-hidden rounded-lg border border-border bg-surface">
              <div className="space-y-4 p-5">
                <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-surface-2 px-4 py-3 text-sm">
                  Write me an opening range breakout strategy. 5 minute opening
                  range, enter long on a break above the range high, short on a
                  break below the range low.
                </div>
                <div className="max-w-[90%] space-y-3">
                  <p className="rounded-lg rounded-tl-sm bg-transparent px-1 py-1 text-sm text-muted">
                    Here&apos;s a complete ORB strategy using the first five minutes of
                    the session as the range.
                  </p>
                  <pre className="overflow-x-auto rounded-md border border-border bg-background p-4 font-mono text-xs leading-relaxed text-foreground">
                    <code>{MOCK_SCRIPT}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-muted sm:flex-row">
          <span>PineDev</span>
          <span>&copy; {new Date().getFullYear()} PineDev. All rights reserved.</span>
          <span>hello@pinedev.app</span>
        </div>
      </footer>
    </div>
  );
}
