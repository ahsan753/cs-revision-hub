# Supabase Deployment Checklist

This repo contains the database migrations and Edge Functions for accounts, ranked XP, and leaderboards. Secrets are intentionally not committed.

## 1. Create and Link Project

Create a Supabase project in the Dashboard, preferably in a UK/EU region. Then run:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

If the CLI is already authenticated through `SUPABASE_ACCESS_TOKEN`, use:

```bash
SUPABASE_ACCESS_TOKEN=... supabase link --project-ref YOUR_PROJECT_REF
```

## 2. Configure Auth

In `supabase/config.toml`, the local settings already enable:

- Email confirmations
- Minimum password length 8
- Before-user-created hook for `@student.orbital.education`

For the hosted project, confirm these dashboard settings:

- Email provider: custom SMTP configured before class rollout
- Redirect URLs include:
  - `http://127.0.0.1:5173`
  - `https://ashah.github.io/cs-revision-hub/`
- Auth Hook `before_user_created` points to:
  - `pg-functions://postgres/public/hook_restrict_signup_by_email_domain`

## 3. Push Database Migrations

```bash
npm run seed:content
supabase db push
supabase db advisors --linked --fail-on none
```

The migrations create RLS policies, profile/class RPCs, leaderboard RPCs, ranked scoring tables, and seed `content_items` from `content-bank.json`.

## 4. Deploy Edge Functions

Set allowed browser origins:

```bash
supabase secrets set CORS_ALLOWED_ORIGINS=http://127.0.0.1:5173,https://ashah.github.io
```

If using Resend API for custom/test email sending, replace `re_xxxxxxxxx` with your real Resend API key and set it as a Supabase secret. Do not put the API key in frontend code.

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxx
supabase secrets set "RESEND_FROM_EMAIL=CS Revision Hub <onboarding@resend.dev>"
```

Deploy functions with JWT verification enabled:

```bash
supabase functions deploy record-ranked-answer --use-api
supabase functions deploy delete-account --use-api
supabase functions deploy send-test-email --use-api
```

## 5. Frontend Env Vars

Create a local `.env` from `.env.example`:

```bash
cp .env.example .env
```

Set:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

For GitHub Pages, add the same values as repository/action secrets or build environment variables.

## 6. Teacher Bootstrap

Create the teacher auth user manually in Supabase Auth. Then promote it:

```sql
update public.profiles
set role = 'teacher'
where id = 'TEACHER_USER_UUID';
```

Only teacher accounts can create classes, view rosters, approve display names, or remove students from classes.

## 7. Smoke Tests

After deploy:

- Sign up with `@student.orbital.education`; non-school domains should be rejected.
- Verify email before joining a class.
- Create a class as teacher and join with a student account.
- Approve the student's display name.
- Answer a ranked MCQ online; `progress.xp` should increase.
- Confirm offline/local progress does not change leaderboard XP.
- Confirm leaderboard RPCs never return email, `full_name`, or user ids.
