# PineDev — setup

Numbered, copy-paste-level steps to get PineDev running locally and in production.

Stack: Next.js 15, Supabase (Postgres + Auth, accessed directly via Drizzle ORM), Anthropic Claude (multiple models), Stripe (billing).

Sign-in supports magic link, email/password, and Google — all through Supabase Auth.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com), sign in, click **New project**.
2. Name it, set a database password (write it down — you'll need it for `DATABASE_URL` in step 4), pick a region, click **Create**. Wait for it to finish provisioning.

## 2. Run the migrations

1. In the Supabase dashboard, open **SQL Editor** → **New query**.
2. Copy everything from [drizzle/0000_busy_raza.sql](drizzle/0000_busy_raza.sql) in this repo, paste it in, and click **Run**. This creates the `profile`, `waitlist`, `conversation`, `message` and `strategy` tables, all indexes and foreign keys, and a trigger that automatically creates a `profile` row for every new signed-up user.
3. Repeat with [drizzle/0001_right_kang.sql](drizzle/0001_right_kang.sql) — this adds the billing columns (`stripeCustomerId`, `stripeSubscriptionId`, `subscriptionStatus`) to `profile`.

(Alternative: once `DATABASE_URL` is set in step 4, you can instead run `npm run db:migrate` from your machine, which applies both files in order.)

## 3. Set the auth redirect URL

1. In the Supabase dashboard, go to **Authentication** → **URL Configuration**.
2. Set **Site URL** to `http://localhost:3000` for now.
3. Under **Redirect URLs**, add `http://localhost:3000/auth/callback`.

## 4. Fill in `.env.local`

1. Copy the example env file if you haven't already:
   ```bash
   cp .env.example .env.local
   ```
2. In Supabase, go to **Project Settings** → **API** and copy the **Project URL** and the **anon/publishable** key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Go to **Project Settings** → **Database** → **Connection string**, select the **Transaction pooler** tab (not "Direct connection" — the pooler is required for serverless environments like Vercel), copy it, and fill in the password you set in step 1. Put the result in `DATABASE_URL`.
4. Get an Anthropic API key from [console.anthropic.com](https://console.anthropic.com) → **API Keys** and put it in `ANTHROPIC_API_KEY`.
5. Leave `NEXT_PUBLIC_SITE_URL` as `http://localhost:3000` for local development.
6. Leave the `STRIPE_*` variables blank for now if you don't want billing yet — the app runs fine without them; the "Upgrade" button on the Billing page just stays disabled and says so.

## 5. Enable Google sign-in (optional)

Skip this if magic link and password sign-in are enough for now — nothing else in the app depends on Google being configured.

1. In [Google Cloud Console](https://console.cloud.google.com), create a project (or use an existing one), then go to **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
2. Application type: **Web application**. Under **Authorized redirect URIs**, add your Supabase project's callback URL — find the exact URL to use in Supabase under **Authentication** → **Sign In / Providers** → **Google** (it shows the callback URL to paste into Google).
3. Copy the **Client ID** and **Client Secret** Google gives you.
4. In Supabase, go to **Authentication** → **Sign In / Providers** → **Google**, toggle it on, and paste in the Client ID and Client Secret. Save.
5. That's it — no code or env var changes needed on this end. The "Continue with Google" button on `/login` starts working immediately.

## 6. Set up Stripe billing (optional)

Skip this if you don't need paid plans yet — the app works fully without it.

1. Create a [Stripe](https://stripe.com) account if you don't have one. Stay in **test mode** while developing (toggle top-right in the dashboard).
2. Go to **Product catalog** → **Add product**. Name it (e.g. "PineDev Pro"), set a recurring price, and save. Copy the **Price ID** (starts with `price_`) into `STRIPE_PRICE_ID`.
3. Go to **Developers** → **API keys**, copy the **Secret key** into `STRIPE_SECRET_KEY`.
4. Go to **Developers** → **Webhooks** → **Add endpoint**. For local testing, use the [Stripe CLI](https://stripe.com/docs/stripe-cli) instead (`stripe listen --forward-to localhost:3000/api/stripe/webhook`), which prints a webhook signing secret directly in your terminal — put that in `STRIPE_WEBHOOK_SECRET`. For production, point the endpoint at `https://YOUR-DOMAIN/api/stripe/webhook`, select the events `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`, and copy that endpoint's **Signing secret** into `STRIPE_WEBHOOK_SECRET`.
5. Restart the dev server after setting these. The Billing page's "Upgrade to Pro" button now creates a real Stripe Checkout session.

Paid subscribers get a higher daily message cap (1000/day vs. 50/day free) — see `lib/daily-cap.ts` to change either number.

## 7. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in at `/login` with magic link, password, or Google.

## 8. Deploy to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import it.
3. Add the environment variables from `.env.local` (skip the `STRIPE_*` ones if you didn't set up billing), with `NEXT_PUBLIC_SITE_URL` set to your production URL (e.g. `https://pinedev.vercel.app` — you may need to deploy once first to know it, then update and redeploy).
4. Click **Deploy**.
5. Back in Supabase → **Authentication** → **URL Configuration**, add `https://YOUR-VERCEL-URL/auth/callback` to **Redirect URLs**.
6. If you're using Stripe, add a production webhook endpoint pointed at `https://YOUR-VERCEL-URL/api/stripe/webhook` (see step 6.4) and update `STRIPE_WEBHOOK_SECRET` in Vercel with that endpoint's own signing secret — it's different from the CLI's local one.

## 9. Approve a waitlist user manually

There is no self-serve approval flow — every account is approved by hand.

1. In the Supabase dashboard, go to **Table Editor** → `profile`.
2. Find the row matching the user's email.
3. Click the `isApproved` cell and change it from `false` to `true`.
4. Save. The user can now refresh `/chat` and use the product — no restart or redeploy needed (approval is checked fresh on every request).

To see everyone who joined the public waitlist (from the landing page form, separate from real accounts), check the `waitlist` table the same way.

## Note on Row Level Security

Supabase's Postgres ships with Row Level Security available, and Supabase's own client library (`supabase-js`) normally enforces it as a second line of defense underneath application code. This app instead connects to the same Postgres database directly via Drizzle, using the connection string from step 4 — which authenticates as a role that bypasses RLS entirely. That means access control here is enforced only in application code (every query filters by the signed-in user's id — see `lib/gate.ts` and every route handler and page), not backstopped by the database itself. This is normal for an ORM-based stack, but it's one layer of defense instead of two, worth knowing if you extend this later.
