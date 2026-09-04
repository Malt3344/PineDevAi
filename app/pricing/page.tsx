import Link from "next/link";
import { Check, Clock } from "lucide-react";
import { startCheckoutAction } from "@/app/chat/account/billing/actions";
import { WaitlistForm } from "@/components/WaitlistForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LIVE_FEATURES = [
  "Chat with an AI agent that writes and fixes Pine Script v6",
  "Every script is reviewed by a second pass that checks for syntax errors and Pine v6 best practices before you see it",
  "1,000 messages a day",
  "Save strategies to your personal library",
  "Instant access — no waitlist",
];

const COMING_SOON_FEATURES = [
  "Everything in the $39 plan",
  "Access to our best available models",
  "Full validation — a verdict grade for every strategy",
  "Market regime analysis",
  "Monte Carlo simulation of a strategy's risk of ruin",
  "Higher daily limits",
];

/** Public pricing page. The $39 plan is live and matches the real, running Stripe plan; the $139 plan is real but not built yet, and is marked as such. */
export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          PineDev
        </Link>
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login" />}>
          Log in
        </Button>
      </header>

      <main className="flex-1 px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-balance">
            Simple pricing
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            One plan you can use today. One we&apos;re actively building.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
          <Card className="border-primary/40">
            <CardHeader>
              <CardTitle className="text-base font-medium text-primary">Standard</CardTitle>
              <p className="text-3xl font-semibold">
                $39<span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2.5 text-sm">
                {LIVE_FEATURES.map((feature) => (
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
              <CardTitle className="text-base font-medium text-muted-foreground">
                Pro
              </CardTitle>
              <Badge variant="secondary">
                <Clock className="size-3" />
                Coming soon
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-semibold text-muted-foreground">
                $139<span className="text-sm font-normal">/mo</span>
              </p>
              <ul className="space-y-2.5 text-sm">
                {COMING_SOON_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border pt-4">
                <p className="mb-3 text-xs text-muted-foreground">
                  Not available yet — we&apos;re building it in production. Join the
                  waitlist and we&apos;ll email you when it&apos;s ready. Access is limited
                  even once it launches.
                </p>
                <WaitlistForm />
              </div>
            </CardContent>
          </Card>
        </div>
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
