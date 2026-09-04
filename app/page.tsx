import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LandingDemo } from "@/components/LandingDemo";
import { Button } from "@/components/ui/button";

const HOW_IT_WORKS = [
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
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-sm font-semibold tracking-tight">PineDev</span>
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login" />}>
          Log in
        </Button>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pt-20 pb-24 text-center sm:pt-28">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Describe your strategy.
            <br />
            Get working Pine Script v6.
          </h1>
          <p className="mt-6 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
            PineDev is an AI agent that writes and fixes TradingView Pine Script for
            you. Paste a compiler error and it ships a corrected script back &mdash;
            no forums, no guesswork.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" nativeButton={false} render={<Link href="/login" />}>
              Get Started
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/pricing" />}
            >
              View Pricing
              <ArrowRight />
            </Button>
          </div>

          <p className="mt-10 text-xs text-muted-foreground">
            Pick between multiple Claude models, and save the strategies you
            like to a personal library.
          </p>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <h2 className="text-center text-sm font-medium tracking-wide text-muted-foreground uppercase">
              How it works
            </h2>
            <div className="mt-10 grid gap-10 sm:grid-cols-3">
              {HOW_IT_WORKS.map((item) => (
                <div key={item.step}>
                  <span className="font-mono text-sm text-primary">{item.step}</span>
                  <h3 className="mt-3 text-base font-medium">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-3xl px-6 py-20">
            <h2 className="text-center text-sm font-medium tracking-wide text-muted-foreground uppercase">
              In practice
            </h2>
            <LandingDemo />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row">
          <span>PineDev</span>
          <span>&copy; {new Date().getFullYear()} PineDev. All rights reserved.</span>
          <span>hello@pinedev.app</span>
        </div>
      </footer>
    </div>
  );
}
