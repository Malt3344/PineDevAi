# PineDev

Validate a TradingView strategy like a quant, from your own Claude.

Users sign up, connect their own Claude (desktop app, claude.ai or Claude Code) once, and describe a trading idea. Claude runs the protocol on the user's own Claude plan; PineDev stores each idea as a **study** and shows the report. PineDev never handles a Claude login or key, which keeps it within Anthropic's terms.

The protocol, in seven stages:

1. **Hypothesis**: pre-register the edge, the in-sample/out-of-sample split and the pass criteria, then lock them.
2. **Build**: Claude writes the Pine v6 strategy with costs, a date-window input and no lookahead; PineDev lints it for backtest-lying patterns.
3. **In-sample**: TradingView's exported trade list is uploaded. Every upload counts as a trial.
4. **Stress test**: deflated Sharpe ratio, bootstrap Monte Carlo drawdown, cost stress, outlier removal and period consistency.
5. **Out-of-sample**: a one-shot test on held-out data. Reuse is recorded and lowers the grade.
6. **Verdict**: every pre-registered criterion scored (Validated / Promising / Fragile / Rejected).
7. **Incubation**: forward trades plotted against the band the in-sample trades predict.

The formulas are documented on the public `/methodology` page.

## How Claude connects

- `app/api/mcp` — a stateless MCP server (Streamable HTTP). Its tools live in `lib/mcp/tools.ts`, and every write goes through `lib/study-ops.ts`, the same code the web app's server actions use.
- OAuth 2.1 with dynamic client registration and PKCE (`lib/oauth.ts`, `app/oauth/authorize`, `app/api/oauth/*`, `app/.well-known/*`). Users log in to PineDev and press Allow. Tokens are stored hashed and can be revoked from `/connect`.
- `claude-plugin/` — the Claude Code plugin marketplace (skills + connection). Push it as its own public repo and set `lib/connect.ts`. Regenerate its generated files with `PINEDEV_URL=https://… npm run plugin:build`.

## Stack

- **Framework**: Next.js 15 (App Router), TypeScript (strict), Tailwind CSS
- **Database**: Postgres, accessed via Drizzle ORM
- **Auth**: Auth.js (NextAuth v5) — email/password (bcrypt-hashed) or Google
- **Billing**: Stripe subscriptions
- **Tests**: Vitest + React Testing Library

## Project layout

```
app/
  page.tsx                landing page
  login/                  sign-in, sign-up, Google
  methodology/            public description of every test
  oauth/authorize/        the "Connect Claude" consent screen
  (app)/                  signed-in shell: studies, studies/[id] report, connect, account
  api/mcp/                MCP endpoint for the user's Claude
  api/oauth/, .well-known/  OAuth endpoints and discovery
  api/upload/[token]/     one-time trade-list upload links
  api/stripe/webhook/     subscription status
components/               shared UI; study/ is the report
lib/
  gate.ts                 approval check (single source of truth)
  quant/                  the validation engine — pure, deterministic, unit-tested:
                          trades.ts (TradingView CSV parser), stats.ts (metrics, PSR/DSR),
                          montecarlo.ts (seeded bootstrap), protocol.ts (stages, criteria),
                          analysis.ts (checks + verdict), pine-lint.ts
  study-ops.ts            every write a study can receive
  studies.ts              loads a study and keeps the list summary fresh
  mcp/, oauth.ts          the Claude connection
  pine-reference.ts       every Pine v6 built-in signature
  auth/, db/              Auth.js config, Drizzle schema and client
drizzle/                  generated SQL migrations
claude-plugin/            the Claude Code plugin (skills + connection)
```

Route handlers stay thin: validate input, check auth, call one `lib` function, return a response. Business logic lives in `lib` so it is testable without HTTP.

## Getting started

See [SETUP.md](SETUP.md) for full, numbered setup and deployment instructions (Postgres, database migration, environment variables, local dev, Vercel deploy, approving users).

Quick version:

```bash
cp .env.example .env.local   # fill in your own values
npm install
npm run dev
```

## Testing

```bash
npm test
```

## Security notes

- Middleware only redirects unauthenticated visitors as a UX convenience — every page and API route independently re-validates the session and approval status server-side via `lib/gate.ts`.
- The client never supplies its own identity; it always comes from the server-side session (a signed Auth.js JWT).
- Passwords are hashed with bcrypt (`bcrypt-ts`) and never stored or logged in plaintext.
