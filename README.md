# PineDev

PineDev writes and fixes TradingView Pine Script v6 strategies through chat. Describe a strategy in plain language, get a complete script back, paste a compiler error, get it fixed.

## Stack

- **Framework**: Next.js 15 (App Router), TypeScript (strict), Tailwind CSS
- **Database**: Postgres (Supabase-hosted), accessed via Drizzle ORM
- **Auth**: Supabase Auth, email magic link only — no passwords, no OAuth
- **AI**: Vercel AI SDK v5 with `@ai-sdk/anthropic`, multiple selectable Claude models
- **Tests**: Vitest + React Testing Library

## Project layout

```
app/
  page.tsx                landing page
  login/                  magic-link sign-in
  auth/callback/          Supabase auth redirect handler
  chat/                   conversation list, active chat, saved strategies
  api/                    waitlist, chat, strategies route handlers
components/               shared UI components
lib/
  gate.ts                 approval check (single source of truth)
  daily-cap.ts            per-user daily message limit
  agent/                  system prompt, model registry, response generation
  db/                     Drizzle schema and client
  supabase/               Supabase auth clients (browser, server, middleware)
drizzle/                  generated SQL migration
```

Route handlers stay thin: validate input, check auth, call one `lib` function, return a response. Business logic lives in `lib` so it is testable without HTTP.

## Getting started

See [SETUP.md](SETUP.md) for full, numbered setup and deployment instructions (Supabase project, database migration, environment variables, local dev, Vercel deploy, approving users).

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

- Middleware only redirects unauthenticated visitors as a UX convenience — every page and API route independently re-validates the session and approval status server-side.
- The client never supplies its own identity; it always comes from the server-side session.
- See the "Note on Row Level Security" section in [SETUP.md](SETUP.md) for how access control is enforced in this architecture.
