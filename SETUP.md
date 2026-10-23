# PineDev — setup

Numbered, copy-paste-level steps to get PineDev running locally and in production.

Stack: Next.js 15, Postgres (accessed directly via Drizzle ORM), Auth.js (email/password + Google), Anthropic Claude + OpenRouter (multiple models), Stripe (billing).

## 1. Create a Postgres database

Any Postgres works. Supabase's free tier is a convenient option if you don't already have one:

1. Go to [supabase.com](https://supabase.com), sign in, click **New project**.
2. Name it, set a database password (write it down — you'll need it for `DATABASE_URL` in step 3), pick a region, click **Create**. Wait for it to finish provisioning.
3. Go to **Project Settings** → **Database** → **Connection string**, select the **Transaction pooler** tab (not "Direct connection" — the pooler is required for serverless environments like Vercel), copy it, and fill in the password you set above.

## 2. Run the migration

Once `DATABASE_URL` is set (step 3), run every migration in `drizzle/` from your machine:

```bash
npm run db:migrate
```

Run it again whenever a new file appears in `drizzle/`. Skipping one leaves the app failing with server errors as soon as a page touches the missing table.

## 3. Fill in `.env.local`

1. Copy the example env file if you haven't already:
   ```bash
   cp .env.example .env.local
   ```
2. Generate an Auth.js session secret and put it in `AUTH_SECRET`:
   ```bash
   openssl rand -base64 33
   ```
   Anyone with this value can forge session tokens, so use a different one in production than in local dev.
3. Put your Postgres connection string (from step 1) in `DATABASE_URL`.
4. No AI key is needed: users bring their own Claude.
5. Leave `NEXT_PUBLIC_SITE_URL` as `http://localhost:3000` for local development.
6. Leave `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` and the `STRIPE_*` variables blank for now if you don't want Google sign-in or billing yet — the app runs fine without them; the Google button on `/login` and the "Upgrade" button on the Billing page just stay disabled.

## 4. Enable Google sign-in (optional)

Skip this if email/password sign-in is enough for now — nothing else in the app depends on Google being configured.

1. In [Google Cloud Console](https://console.cloud.google.com), create a project (or use an existing one), then go to **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
2. Application type: **Web application**. Under **Authorized redirect URIs**, add `http://localhost:3000/api/auth/callback/google` for local dev (and your production URL's equivalent once deployed).
3. Copy the **Client ID** and **Client Secret** into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in `.env.local`.
4. Restart the dev server. The Google button on `/login` starts working immediately.

## 5. Set up Stripe billing (optional)

Skip this if you don't need paid plans yet — the app works fully without it.

1. Create a [Stripe](https://stripe.com) account if you don't have one. Stay in **test mode** while developing (toggle top-right in the dashboard).
2. Go to **Product catalog** → **Add product**. Name it (e.g. "PineDev Standard"), set a recurring price, and save. Copy the **Price ID** (starts with `price_`) into `STRIPE_PRICE_ID`.
3. Go to **Developers** → **API keys**, copy the **Secret key** into `STRIPE_SECRET_KEY`.
4. Go to **Developers** → **Webhooks** → **Add endpoint**. For local testing, use the [Stripe CLI](https://stripe.com/docs/stripe-cli) instead (`stripe listen --forward-to localhost:3000/api/stripe/webhook`), which prints a webhook signing secret directly in your terminal — put that in `STRIPE_WEBHOOK_SECRET`. For production, point the endpoint at `https://YOUR-DOMAIN/api/stripe/webhook`, select the events `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`, and copy that endpoint's **Signing secret** into `STRIPE_WEBHOOK_SECRET`.
5. Restart the dev server after setting these. The Billing page's "Upgrade" button now creates a real Stripe Checkout session.

Paying for the plan also auto-approves the account (see step 6) — see `lib/billing.ts`'s `syncSubscriptionStatus`. See `lib/daily-cap.ts` to change either plan's daily message cap.

## 6. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in at `/login` with email/password or Google.

## 7. Deploy to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import it.
3. Add the environment variables from `.env.local` (a fresh `AUTH_SECRET`, not the local-dev one — skip the `STRIPE_*`/`AUTH_GOOGLE_*` ones if you didn't set them up), with `NEXT_PUBLIC_SITE_URL` set to your production URL (e.g. `https://pinedev.vercel.app` — you may need to deploy once first to know it, then update and redeploy).
4. Click **Deploy**.
5. If you're using Google sign-in, add `https://YOUR-VERCEL-URL/api/auth/callback/google` to the OAuth client's authorized redirect URIs in Google Cloud Console.
6. If you're using Stripe, add a production webhook endpoint pointed at `https://YOUR-VERCEL-URL/api/stripe/webhook` (see step 5.4) and update `STRIPE_WEBHOOK_SECRET` in Vercel with that endpoint's own signing secret — it's different from the CLI's local one.

## 8. Approve a waitlist user manually

There is no self-serve approval flow — every account is approved by hand (unless they pay, which auto-approves — see step 5).

1. Open your Postgres provider's table editor (e.g. Supabase's **Table Editor**) and find the `user` table.
2. Find the row matching the user's email.
3. Click the `isApproved` cell and change it from `false` to `true`.
4. Save. The user can now refresh `/studies` and use the product — no restart or redeploy needed (approval is checked fresh on every request).

To see everyone who joined the public Pro-tier waitlist (from the landing page form, separate from real accounts), check the `waitlist` table the same way.

## Note on Row Level Security

This app connects to Postgres directly via Drizzle rather than through a client library that enforces row-level security, so access control is enforced only in application code — every query filters by the signed-in user's id (see `lib/gate.ts` and every route handler and page), not backstopped by the database itself. This is normal for an ORM-based stack, but it's one layer of defense instead of two, worth knowing if you extend this later.
