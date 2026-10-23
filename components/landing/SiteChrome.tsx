import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
      <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <FlaskConical className="size-3.5" />
      </span>
      PineDev
    </Link>
  );
}

/** The marketing pages' shared header: landing, pricing, methodology. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Wordmark />
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          <Link href="/#how" className="hover:text-foreground">
            How it works
          </Link>
          <Link href="/methodology" className="hover:text-foreground">
            Methodology
          </Link>
          <Link href="/#pricing" className="hover:text-foreground">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/login?mode=sign-up&callbackUrl=${encodeURIComponent("/connect")}`}>Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-4">
        <div>
          <Wordmark />
          <p className="mt-2 text-xs text-muted-foreground">
            Validate TradingView strategies like a quant — from your own Claude.
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-foreground">Product</p>
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
            <li>
              <Link href="/#how" className="hover:text-foreground">
                How it works
              </Link>
            </li>
            <li>
              <Link href="/methodology" className="hover:text-foreground">
                Methodology
              </Link>
            </li>
            <li>
              <Link href="/#pricing" className="hover:text-foreground">
                Pricing
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-foreground">Account</p>
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
            <li>
              <Link href="/login" className="hover:text-foreground">
                Log in
              </Link>
            </li>
            <li>
              <Link href="/login?mode=sign-up" className="hover:text-foreground">
                Create account
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-foreground">Contact</p>
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
            <li>hello@pinedev.app</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs leading-relaxed text-muted-foreground">
          &copy; {new Date().getFullYear()} PineDev. Educational research software, not financial
          advice. Past performance, simulated or backtested, does not guarantee future results.
        </div>
      </div>
    </footer>
  );
}
