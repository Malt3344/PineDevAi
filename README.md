# PineDev

PineDev is a strategy-validation protocol for retail traders. Each idea becomes a **study** that goes through seven stages, the same sequence a systematic fund uses before risking capital:

1. **Hypothesis**: pre-register the edge, the in-sample/out-of-sample split and the pass criteria, then lock them.
2. **Build**: a research assistant writes the Pine v6 strategy with costs, a date-window input and no lookahead, and the script is linted for backtest-lying patterns.
3. **In-sample**: upload TradingView's exported trade list. Every upload counts as a trial.
4. **Stress test**: deflated Sharpe ratio, bootstrap Monte Carlo drawdown, cost stress, outlier removal and period consistency.
5. **Out-of-sample**: a one-shot test on held-out data. Reuse is recorded and lowers the grade.
6. **Verdict**: every pre-registered criterion scored (Validated / Promising / Fragile / Rejected).
7. **Incubation**: forward trades plotted against the band the in-sample trades predict.

The formulas are documented on the public `/methodology` page.

### Use it from your own Claude

Users connect their own Claude (desktop app, claude.ai or Claude Code) to PineDev instead of using the built-in chat. Claude then runs the protocol on the user's own Claude plan. PineDev never handles a Claude login or key, which keeps it within Anthropic's terms.

- `app/api/mcp` — a stateless MCP server (Streamable HTTP). Its tools live in `lib/mcp/tools.ts`, and every write goes through `lib/study-ops.ts`, the same code the web app uses.
- OAuth 2.1 with dynamic client registration and PKCE (`lib/oauth.ts`, `app/oauth/authorize`, `app/api/oauth/*`, `app/.well-known/*`). Users log in to PineDev and press Allow. Tokens are stored hashed and can be revoked from `/chat/connect`.
- `claude-plugin/` — the Claude Code plugin marketplace (skills + connection). Push it as its own public repo and set `lib/connect.ts`. Regenerate its generated files with `PINEDEV_URL=https://… npm run plugin:build`.

## Stack

- **Framework**: Next.js 15 (App Router), TypeScript (strict), Tailwind CSS
- **Database**: Postgres, accessed via Drizzle ORM
- **Auth**: Auth.js (NextAuth v5) — email/password (bcrypt-hashed) or Google
- **AI**: Vercel AI SDK v5 with `@ai-sdk/anthropic` and `@openrouter/ai-sdk-provider`, multiple selectable models
- **Billing**: Stripe subscriptions
- **Tests**: Vitest + React Testing Library

## Project layout

```
app/
  page.tsx                landing page
  pricing/                pricing page
  login/                  sign-in, sign-up, Google
  api/auth/[...nextauth]/ Auth.js route handler
  chat/                   research desk, studies (protocol + assistant), script library, account
  chat/study-actions.ts   hypothesis lock/amend, trade-run upload/delete (server actions)
  methodology/            public description of every test
  api/                    waitlist, chat, documents, vote, stripe webhook
  share/[id]/             read-only public view of a chat marked "public"
components/               shared UI components
lib/
  gate.ts                 approval check (single source of truth)
  daily-cap.ts            per-user daily message limit
  cost-cap.ts             per-user monthly spend limit
  pricing.ts              plan/feature copy shared by /pricing and the landing page
  quant/                  the validation engine — pure, deterministic, unit-tested:
                          trades.ts (TradingView CSV parser), stats.ts (metrics, PSR/DSR),
                          montecarlo.ts (seeded bootstrap), protocol.ts (stages, criteria),
                          analysis.ts (checks + verdict), pine-lint.ts, context.ts (assistant context)
  studies.ts              loads a study and keeps the research-desk summary fresh
  auth/                   Auth.js config
  agent/                  system prompt, model registry, response generation
  db/                     Drizzle schema and client
drizzle/                  generated SQL migration
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
