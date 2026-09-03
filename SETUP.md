# PineDev — setup

Numbered, copy-paste-level steps to get PineDev running locally and in production.

Stack: Next.js 15, Supabase (Postgres + Auth, accessed directly via Drizzle ORM), Anthropic Claude (multiple models).

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com), sign in, click **New project**.
2. Name it, set a database password (write it down — you'll need it for `DATABASE_URL` in step 4), pick a region, click **Create**. Wait for it to finish provisioning.

## 2. Run the migration

1. In the Supabase dashboard, open **SQL Editor** → **New query**.
2. Copy everything from [drizzle/0000_busy_raza.sql](drizzle/0000_busy_raza.sql) in this repo and paste it in.
3. Click **Run**. This creates the `profile`, `waitlist`, `conversation`, `message` and `strategy` tables, all indexes and foreign keys, and a trigger that automatically creates a `profile` row for every new signed-up user.

(Alternative: once `DATABASE_URL` is set in step 4, you can instead run `npm run db:migrate` from your machine, which applies the same file.)

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

## 5. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in at `/login` with your email and check your inbox for the magic link (sent by Supabase itself — no separate email service needed).

## 6. Deploy to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import it.
3. Add the same four environment variables from `.env.local`, with `NEXT_PUBLIC_SITE_URL` set to your production URL (e.g. `https://pinedev.vercel.app` — you may need to deploy once first to know it, then update and redeploy).
4. Click **Deploy**.
5. Back in Supabase → **Authentication** → **URL Configuration**, add `https://YOUR-VERCEL-URL/auth/callback` to **Redirect URLs**.

## 7. Approve a waitlist user manually

There is no self-serve approval flow — every account is approved by hand.

1. In the Supabase dashboard, go to **Table Editor** → `profile`.
2. Find the row matching the user's email.
3. Click the `isApproved` cell and change it from `false` to `true`.
4. Save. The user can now refresh `/chat` and use the product — no restart or redeploy needed (approval is checked fresh on every request).

To see everyone who joined the public waitlist (from the landing page form, separate from real accounts), check the `waitlist` table the same way.

## Note on Row Level Security

Supabase's Postgres ships with Row Level Security available, and Supabase's own client library (`supabase-js`) normally enforces it as a second line of defense underneath application code. This app instead connects to the same Postgres database directly via Drizzle, using the connection string from step 4 — which authenticates as a role that bypasses RLS entirely. That means access control here is enforced only in application code (every query filters by the signed-in user's id — see `lib/gate.ts` and every route handler and page), not backstopped by the database itself. This is normal for an ORM-based stack, but it's one layer of defense instead of two, worth knowing if you extend this later.
