"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type Status = "idle" | "loading" | "sent" | "error";
type Mode = "sign-in" | "sign-up" | "forgot-password";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.12-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/** The "PineDev" wordmark, always a link back to the landing page. */
function Wordmark() {
  return (
    <Link href="/" className="mb-10 block text-center text-lg font-semibold tracking-tight">
      PineDev
    </Link>
  );
}

/**
 * Sign in, create an account, or reset a forgotten password — Google, or
 * email and password. No magic link. Every branch below keeps a way back
 * to the landing page (the wordmark) or to sign-in (the "Back" link).
 *
 * Defaults to sign-in — most visits here are a returning user, not a new
 * one. A link that specifically means "create an account" (the landing
 * page's "Get Started") passes ?mode=sign-up to start there instead.
 * Without this, a returning user typing their password on the default
 * view would silently trigger signUp() instead of signing in, which
 * re-sends a confirmation email every time rather than logging them in.
 */
function LoginForm() {
  const searchParams = useSearchParams();
  const initialMode: Mode = searchParams.get("mode") === "sign-up" ? "sign-up" : "sign-in";

  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [sentEmail, setSentEmail] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>(initialMode);

  async function handleGoogle() {
    setStatus("loading");
    setErrorMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
    }
    // On success the browser navigates away to Google, so no "loading" reset needed.
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");

    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });

    // Always show the same success state, whether or not an account exists
    // for this email. Surfacing "no account with that email" here would let
    // an attacker enumerate registered addresses one guess at a time —
    // Supabase's own response can't be trusted to hide this by itself, so
    // the UI has to.
    setSentEmail(email);
    setStatus("sent");
  }

  async function handlePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const supabase = createClient();

    if (mode === "sign-up") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setStatus("error");
        setErrorMessage(error.message);
        return;
      }
      setSentEmail(email);
      setStatus("sent");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    window.location.href = "/chat";
  }

  if (status === "sent") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm">
          <Wordmark />
          <Card>
            <CardContent className="text-center">
              <p className="text-sm font-medium text-foreground">Check your email</p>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a link to <span className="text-foreground">{sentEmail}</span>.
                Click it to continue.
              </p>
            </CardContent>
          </Card>
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setMode("sign-in");
            }}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Back to sign in
          </button>
        </div>
      </main>
    );
  }

  if (mode === "forgot-password") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm">
          <Wordmark />
          <h1 className="text-center text-lg font-medium">Reset your password</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a link to set a new one.
          </p>
          <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email address</Label>
              <Input
                id="forgot-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="h-11"
              />
            </div>
            <Button type="submit" disabled={status === "loading"} className="w-full h-11">
              {status === "loading" ? "Sending…" : "Send reset link"}
            </Button>
            <button
              type="button"
              onClick={() => setMode("sign-in")}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Back to sign in
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome to{" "}
          <Link href="/" className="text-primary">
            PineDev
          </Link>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "sign-up" ? "Create your account to get started" : "Sign in to continue"}
        </p>

        <Card className="mt-8 overflow-hidden py-0 text-left">
          <CardContent className="space-y-4 py-6">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11"
              disabled={status === "loading"}
              onClick={handleGoogle}
            >
              <GoogleIcon />
              Continue with Google
            </Button>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            {status === "error" && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}

            <form onSubmit={handlePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "sign-in" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot-password")}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-11"
                />
              </div>
              <Button type="submit" disabled={status === "loading"} className="w-full h-11">
                {status === "loading"
                  ? "Please wait…"
                  : mode === "sign-up"
                    ? "Continue"
                    : "Sign in"}
              </Button>
            </form>
          </CardContent>

          <button
            type="button"
            onClick={() => setMode(mode === "sign-up" ? "sign-in" : "sign-up")}
            className="w-full border-t border-border bg-muted/40 py-4 text-center text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "sign-up" ? (
              <>
                Already have an account? <span className="font-medium text-foreground">Sign in</span>
              </>
            ) : (
              <>
                New here? <span className="font-medium text-foreground">Create an account</span>
              </>
            )}
          </button>
        </Card>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
