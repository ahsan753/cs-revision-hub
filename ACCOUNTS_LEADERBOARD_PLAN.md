# Accounts & Leaderboard — Implementation Plan

**Project:** Interactive Revision Hub (`cs-revision-hub`)
**Feature:** Student login, per-student accounts, XP sync, and a class + personal leaderboard
**Status:** Planning — decisions confirmed, ready to build
**Author:** Mr A Shah, with Claude
**Last updated:** 21 June 2026

---

## 1. Summary

Today the app is **client-only**: no login, no backend, progress saved per-device in `localStorage` (`csrh:v1:progress`), deployed as a static site to GitHub Pages. This feature adds optional **student accounts** so progress follows a student across devices, and a **leaderboard** so students can compete against classmates *and* against their own past performance.

This is a large change because it introduces, for the first time, a **backend, a database, network sync, authentication, and the handling of minors' personal data**. The plan below is deliberately **additive and local-first**: the existing offline app keeps working unchanged for anyone not logged in, and the account layer sits on top.

### Decisions already taken

| Decision | Choice |
|---|---|
| Backend | **Supabase** (Postgres + Auth + Row-Level Security), accessed directly from the static client |
| Sign-in | **Email + password self-signup**, with email verification |
| Signup restriction | **`@student.orbital.education` domain only** — no other addresses can register |
| Leaderboard | **Three views:** class/teaching-set ranking, a **global Year-group board**, and a personal-best / self-improvement view |
| Identity shown publicly | **Display names / aliases** — real full names never shown on rankings (stored privately, teacher-visible only) |
| Class administration | **Mr A Shah only** for v1 |
| Sign-out | **Keeps local cache** so offline play continues; server remains source of truth |
| Data protection | School setting permits collecting basic data (name + email); **age/DOB not collected** |

### Goals

- A student can create an account, sign in on any device, and see their XP/level/streak/mastery resume.
- A student appears on a **class leaderboard** ranked by XP, shown under a chosen alias.
- A student can see their **own progress over time** (personal best XP, streak history, mastery growth).
- The app **still works fully offline and without an account** (degraded only in that there's no cross-device sync or leaderboard).
- Students' data is handled in line with safeguarding and UK GDPR expectations for minors.

### Non-goals (v1)

- Teacher dashboard / analytics (worth a later phase — noted in §13).
- Real-time live leaderboard updates (polling/refresh on load is enough for v1).
- Social features (friends, messaging, comments).
- Fully server-authoritative scoring / cheat-proofing (v1 deters casual cheating; see §6 and §13).
- Migrating the app off GitHub Pages (Supabase keeps it static-friendly).

---

## 2. Architecture overview

The guiding principle is **local-first with background sync**. The Zustand store and `localStorage` remain the working source of truth on-device; Supabase becomes the *durable, cross-device* source of truth and the leaderboard backend.

```
            ┌─────────────────────────── Browser (static app) ───────────────────────────┐
            │                                                                              │
   UI  ───► Zustand progressStore ───► storage.ts (localStorage  csrh:v1:progress)         │
            │        │  ▲                                                                  │
            │        │  │ importProgress() / snapshot                                      │
            │        ▼  │                                                                  │
            │   syncEngine (NEW)  ──debounced push / pull──┐                               │
            │        ▲                                     │                               │
            │   authProvider (NEW, Supabase session)       │                               │
            └──────────────────────────────────────────────┼───────────────────────────────┘
                                                           │  HTTPS (anon key + user JWT)
                                                           ▼
                              ┌──────────────── Supabase ────────────────┐
                              │  Auth (email/password)                    │
                              │  Postgres: profiles, classes, progress    │
                              │  Row-Level Security on every table        │
                              │  leaderboard view (alias + xp only)       │
                              └───────────────────────────────────────────┘
```

Why this shape:

- **Minimal disruption.** The existing store, mastery logic, XP rules, and all seven activities are untouched. We add a sync layer that *observes* the store and a thin auth layer.
- **Offline resilience preserved.** If the network or Supabase is unavailable, the app behaves exactly as it does today; sync resumes when connectivity returns.
- **Static-host friendly.** The browser talks to Supabase directly using the public **anon key**, which is safe to embed in a static bundle *provided Row-Level Security is correctly configured* (this is the standard Supabase model). No server of our own to host.

---

## 3. Data model (Supabase / Postgres)

Three tables plus one read-only view. Progress is stored as a **JSONB snapshot** (for full cross-device restore) alongside a few **denormalised columns** that drive the leaderboard cheaply.

### `profiles` — one row per user, keyed to `auth.users`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | = `auth.users.id` |
| `display_name` | `text` | Alias shown on leaderboard; validated (length, profanity filter); unique per class |
| `full_name` | `text` | **Private** — real name, visible only to the student and the teacher (lets you map alias → student). Never on any leaderboard. |
| `class_id` | `uuid` FK → `classes.id` | Nullable until a student joins a class |
| `year_group` | `text` | e.g. `'Year 10'` — scopes the global leaderboard so it can stay year-specific as cohorts grow |
| `role` | `text` | `'student'` \| `'teacher'`; default `'student'` |
| `leaderboard_opt_in` | `boolean` | Default `true`; lets a student hide from both rankings |
| `created_at` | `timestamptz` | |

> Email lives in `auth.users` only — **never** copied into `profiles` or exposed to other students. `full_name` is collected (permitted in the school setting) but kept private: readable only by the student themselves and the teacher, never returned by any leaderboard query. **No age/DOB is collected.**

### `classes` — a teacher-owned group students join with a code

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `text` | e.g. "Year 10 CS — Set 1" |
| `join_code` | `text` unique | Short human code (e.g. `CS-7QK2`) students enter to join |
| `teacher_id` | `uuid` FK → `auth.users.id` | |
| `created_at` | `timestamptz` | |

### `progress` — one row per student, the durable mirror of the local snapshot

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` PK FK → `auth.users.id` | |
| `xp` | `integer` | Denormalised for leaderboard; **monotonic** (see triggers) |
| `level` | `integer` | Denormalised |
| `streak` | `integer` | Denormalised |
| `total_answered` | `integer` | Denormalised; used for plausibility checks |
| `best_xp` | `integer` | High-water mark for the personal-best view; maintained **server-side** by trigger (`GREATEST(best_xp, NEW.xp)`) — no client tracking needed |
| `snapshot` | `jsonb` | The full `ProgressSnapshot` (itemProgress, history, badges, settings) for restore |
| `updated_at` | `timestamptz` | For last-write-wins conflict handling |
| `updated_device` | `text` | Optional: a random per-device id to aid merge/debug |

### `leaderboard` — a read-only view (the *only* way peers' data is exposed)

Selects `display_name`, `xp`, `level`, `streak`, `class_id`, `year_group`, and a computed `rank` — **and nothing else**. No user id, no email, no `full_name`, no snapshot, no history. Filtered to opted-in students. This single view backs **both** the class board (filter by `class_id`) and the global board (filter by `year_group`).

> **Schema management:** all of the above is created via versioned SQL migrations (Supabase migrations), checked into the repo under `supabase/migrations/`, so the database is reproducible and reviewable — never hand-edited in the dashboard.

---

## 4. Security model (Row-Level Security)

RLS is the backbone of safety here, because the anon key is public. **Every table gets RLS enabled with default-deny**, then explicit policies:

- **`profiles`**
  - *select:* a user can read their **own** full row; the **public field** (`display_name` only) of classmates in the same `class_id`; and the **teacher** can read `full_name` for students in classes they own (alias → student mapping).
  - *insert/update:* a user can write **only their own** row; `role` cannot be self-elevated to `teacher`; `full_name` is never exposed through any leaderboard path.
- **`classes`**
  - *select:* members of the class and its teacher.
  - *insert/update/delete:* teacher (owner) only.
- **`progress`**
  - *select:* a user can read **only their own** row. Classmates' XP is exposed **exclusively** through the `leaderboard` view.
  - *insert/update:* **only their own** row.
- **`leaderboard` view**
  - exposed via a `security definer` function or a view with appropriate grants, returning aggregate/public fields only, scoped to the caller's class.

**Anti-tamper triggers on `progress` (v1 pragmatic tier):**

- `xp`, `best_xp`, and `total_answered` may not **decrease** on update (blocks rollback shenanigans); `best_xp` is maintained as `GREATEST(best_xp, NEW.xp)`.
- Each update's `xp` increase is **capped to a coarse upper bound**: `(NEW.total_answered − OLD.total_answered) × 30`, where 30 = 10 × max difficulty 3 (the most XP any single answer can yield).

> **Honest caveat:** the database **cannot** reproduce the *exact* client cap (`getPlausibleXpCap` = Σ `correctAttempts × 10 × difficulty`), because per-item difficulty lives in `content-bank.json`, not in Postgres. The trigger therefore enforces a *loose* bound plus monotonicity — enough to stop casual XP inflation, but not airtight. Tightening to the exact cap means seeding difficulties into a DB table or going fully server-authoritative (recompute XP from submitted answer events), which is deliberately deferred (see §13).

So casual cheating (editing `localStorage`) does **not** reach the leaderboard, because the DB enforces its own constraints regardless of what the client claims. A determined student could still craft API calls with their own JWT within the allowed envelope.

---

## 5. Authentication & onboarding flow

The app stays usable anonymously; accounts are **opt-in** via a "Sign in to compete" call-to-action.

1. **Sign up** — email + password, **restricted to `@student.orbital.education`** (registration rejects any other domain). Supabase sends a **verification email**; account is limited until verified.
2. **Account setup** — first-run after verification: enter **real name** (stored privately, teacher-visible only) and choose a **display name / alias** (the only public identifier; validated for length and profanity, unique within the class).
3. **Join a class** — student enters the teacher's `join_code`, which places them in the class **and** sets their `year_group`. Until a student joins a class they have **no `year_group`**, so they see only their **personal** view — neither the class nor the global board. Joining is therefore the gateway to both leaderboards, so the setup flow should nudge students to enter a code straight away.
4. **Migrate existing local progress** — if a `csrh:v1:progress` snapshot exists on the device, prompt: *"Bring your existing progress into your account?"* If yes, run it through the existing `importProgress()` (which validates and **caps XP**), then push to Supabase. After this, the server is the source of truth and local becomes a cache.
5. **Returning sign-in** — pull the server snapshot, `importProgress()` it into the store, and continue. On a device with newer local progress, **merge by highest XP / most-answered** before the server overwrites (see §6).
6. **Sign out** — clear the in-memory session but **retain the local cache** so offline play continues; the server copy stays the source of truth on next sign-in.
7. **Account management** (Settings) — change display name, toggle leaderboard opt-in, **delete account** (GDPR erasure). Note: a client holding only the anon key **cannot** delete its own `auth.users` row — that needs admin rights. So deletion calls a small **Supabase Edge Function** (running with the `service_role` key, server-side) that removes the user; `profiles` and `progress` then cascade via `ON DELETE CASCADE`.

**Teacher bootstrap (one-off):** self-signup always creates a `student`, and RLS forbids self-elevation, so creating the first **teacher** (your account) is a manual admin step — set `role = 'teacher'` via SQL/the Supabase dashboard once. Only then can you create classes and join codes. Document this so it isn't forgotten on first setup.

**Guarding routes:** the leaderboard and account pages require a session; everything else (all activities, progress, settings) remains open to anonymous users.

---

## 6. Sync & offline strategy

A new **`syncEngine`** subscribes to the Zustand store:

- **Push (local → server):** on store changes, **debounce** (~5–10 s) and write the denormalised columns + `snapshot` to `progress`. Skip when offline or signed out; queue the latest pending snapshot and flush on reconnect (`navigator.onLine` + `online` event).
- **Pull (server → local):** on sign-in and on app focus/load, fetch the server row and reconcile.
- **Conflict resolution:** single-student-multi-device is the realistic case. Use **last-write-wins by `updated_at`**, but guard XP with a **max-merge** (never let a sync *lower* a student's XP/`best_xp`). This avoids the classic "logged in on phone, lost laptop progress" complaint.
- **PWA / service-worker caveat (important):** the current `sw.js` does cache-first for GET requests. Supabase calls must **bypass the service worker** (match on the `*.supabase.co` origin and skip caching) so the leaderboard and sync never serve stale data. This is a required edit to `public/sw.js`.
- **Shared / lab computers (important for schools):** today there is a single `localStorage` key (`csrh:v1:progress`). On a shared school PC, "keep local cache on sign-out" means the next student would inherit the previous student's progress. **Fix:** namespace the signed-in cache by user id (e.g. `csrh:v1:progress:<userId>`) and keep a separate anonymous key; on sign-out, drop back to the anonymous cache rather than exposing the previous user's data. Migration (step 4 in §5) should only ever offer the **anonymous** cache, never another signed-in user's.

---

## 7. Leaderboard design

Three complementary views, matching the confirmed decision:

- **Class leaderboard** — reads the `leaderboard` view for the student's `class_id`, ordered by `xp` desc. Shows rank, alias, level (with the existing **rank emblem** from `rankSystem.ts`), XP, and streak. Highlights the current student's own row. Refreshes on load and via a manual refresh control (no realtime in v1).
- **Global leaderboard** — the same view filtered by `year_group` (e.g. all of Year 10), so students can see where they sit across the whole cohort, not just their set. Same columns; same alias-only privacy.
- **Personal / self-competition** — extends the existing `ProgressPage`: personal-best XP, current vs best streak, XP gained this week, and mastery growth over time. This is the "compete with yourself" half and works even for students not in a class.

A simple **scope toggle** (Class ▸ Global ▸ Personal, plus This week / All time) keeps it in one page. Empty/edge states: **no class joined** — both the class *and* global boards prompt the student to enter a join code (they need a `year_group` to appear on either); the personal view always works. Also handle: fewer than N students, ties (rank by XP then `best_xp` then earliest `updated_at`), and duplicate aliases on the global board (aliases are unique per class, not per year — acceptable for v1, or tighten to unique per `year_group`).

---

## 8. Frontend changes

### New files

- `src/lib/supabaseClient.ts` — singleton Supabase client from env vars.
- `src/auth/AuthProvider.tsx` + `src/auth/useAuth.ts` — session context, sign-in/up/out, password reset.
- `src/auth/authGuard.tsx` — route wrapper for authed-only pages.
- `src/sync/syncEngine.ts` — store subscription, debounce, push/pull, merge, offline queue, **per-user cache namespacing**.
- `src/pages/LoginPage.tsx`, `src/pages/SignupPage.tsx` (domain-restricted), `src/pages/AccountSetupPage.tsx` (real name + display name + class join).
- `src/pages/LeaderboardPage.tsx`.
- `supabase/migrations/*.sql` — schema, RLS, triggers, leaderboard view.
- `supabase/functions/delete-account/` — Edge Function (service_role) for GDPR account deletion.

### Modified files

- `src/main.tsx` — wrap `<RouterProvider>` in `<AuthProvider>` (and mount the sync engine).
- `src/router.tsx` — add `/login`, `/signup`, `/account`, `/leaderboard`.
- `src/store/progressStore.ts` — expose a clean "apply server snapshot" path (largely reuse `importProgress`). No `best_xp` field needed (server trigger maintains it). The store's localStorage key handling moves behind the per-user namespacing in `syncEngine`/`storage.ts`.
- `src/pages/ProgressPage.tsx` — add the personal-best / self-competition panel.
- `src/pages/SettingsPage.tsx` — account section (sign out, change alias, opt-in toggle, delete account).
- `src/components/layout/AppShell.tsx` — sign-in CTA / account chip + leaderboard nav entry.
- `public/sw.js` — bypass Supabase origin (see §6).
- `.github/workflows/deploy.yml` — inject Supabase env vars from GitHub Actions secrets at build.
- New dependency: `@supabase/supabase-js`.

---

## 9. Safeguarding & data protection (minors)

Year 10 students are minors, and email self-signup means **collecting their personal data**. The points below are still a checklist to action, **not legal advice** — but the key consent question is now resolved.

- **Lawful basis & consent — confirmed.** USI operates this in a school setting where collecting basic data (name + email) is permitted; no separate parental consent letters are required for this. **Age / date of birth is not collected.** (Keep a record of this decision; revisit if the data collected ever expands.)
- **Data minimisation.** Collect only email (login/recovery), real name (private, teacher-visible only), and a public alias. No DOB, no other personal data.
- **Restrict signups to the school — confirmed.** Registration is limited to the **`@student.orbital.education`** domain (allow-list), so only USI students can join. Enforce both in the UI and, ideally, with a Supabase auth hook / trigger so it can't be bypassed.
- **Aliases are public, so moderate them.** Profanity filter on `display_name`, uniqueness per class, and a teacher ability to rename/reset an inappropriate alias.
- **Opt-out of the leaderboard** (`leaderboard_opt_in`) for students who don't want to be ranked — competition shouldn't be compulsory.
- **Right to erasure.** One-click account deletion via the `delete-account` Edge Function (removes the auth user; `profiles`/`progress` cascade).
- **Privacy notice.** A short, age-appropriate notice explaining what's stored and why, linked from signup.
- **Wellbeing.** Public ranking can demotivate lower-ranked students. Mitigations: emphasise the personal-best view, consider showing only nearby ranks rather than a global bottom, and keep the tone encouraging.
- **Transport & storage.** All traffic is HTTPS; Supabase data is encrypted at rest; pick an EU/UK Supabase region for data residency.

---

## 10. Environment & deployment

- **Secrets:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Vite env vars. The anon key is designed to be public **but only safe behind correct RLS** — RLS review is a release gate.
- **Local dev:** `.env.local` (git-ignored); document in README.
- **CI/CD:** add the two values as GitHub Actions secrets and inject them in `build:github`. Keep the SPA 404 fallback.
- **Supabase project:** create one project (free tier comfortably covers a class), EU/UK region, with `service_role` key kept **server-side/admin only** (never shipped). I can scaffold the project, schema, RLS, and migrations via the Supabase connector when you're ready to build.
- **Email / SMTP (don't skip):** Supabase's built-in email sender is heavily rate-limited (a few messages per hour) and is **not** meant for production. A whole class signing up or resetting passwords at once will hit the limit and verification mails will silently fail. Configure **custom SMTP** (the school's mail relay, or a provider like Resend/SendGrid/Postmark) before any class-wide rollout. Also confirm students can actually receive mail at `@student.orbital.education`.
- **Free-tier pausing:** Supabase pauses free projects after ~7 days of inactivity (e.g. over a school holiday). First request after a pause may error or be slow until it resumes; the app degrades to offline meanwhile. A paid tier or a scheduled keep-alive avoids it.
- **Teacher bootstrap:** remember the one-off manual promotion of your account to `role = 'teacher'` (see §5) before creating classes.

---

## 11. Phased delivery roadmap

Each phase is independently shippable and leaves the app working.

### Phase 0 — Foundations *(no code)*
- Draft the short, age-appropriate privacy notice; record the consent decision; pick an EU/UK Supabase region.
- Create the Supabase project; add env vars + CI secrets; configure the `@student.orbital.education` signup allow-list.
- **Done when:** project exists, secrets wired, privacy notice drafted. *(Consent/domain/admin/leaderboard/sign-out decisions already confirmed — see §1 and §13.)*

### Phase 1 — Auth scaffolding (no data sync yet)
- Add `@supabase/supabase-js`, `supabaseClient.ts`, `AuthProvider`, `useAuth`.
- Login / signup / verify / password-reset pages; account chip in the shell.
- Enforce the `@student.orbital.education` domain (UI + auth hook/trigger).
- **Configure custom SMTP** so verification/reset emails actually deliver at class scale.
- **Done when:** a student can sign up with a school address, receive a verification email, and sign in/out. No progress sync yet.

### Phase 2 — Profiles, classes & display names
- Migrations for `profiles` + `classes` + RLS; profanity/uniqueness validation.
- **One-off:** promote your account to `role = 'teacher'`.
- Account-setup flow (real name + alias + join class by code → sets `year_group`); teacher path to create a class + code.
- **Done when:** a verified student has a profile, a private real name, an alias, and is in a class with a `year_group`.

### Phase 3 — Progress sync + migration
- `progress` table + RLS + anti-tamper triggers (monotonic xp/best_xp, coarse cap).
- `syncEngine` (debounced push, pull on login, max-merge, offline queue); service-worker bypass.
- **Per-user cache namespacing** + safe sign-out behaviour on shared devices.
- First-login migration of the **anonymous** local snapshot via `importProgress`.
- **Done when:** progress survives sign-out, reappears on another device, and a shared lab PC never leaks one student's progress to the next.

### Phase 4 — Leaderboard (class + personal)
- `leaderboard` view + read path; `LeaderboardPage` with rank emblems and self-highlight.
- Personal-best panel on `ProgressPage`; scope toggle; empty/tie states.
- **Done when:** students see themselves ranked in class and can track their own best.

### Phase 5 — Hardening & admin
- Tighten triggers/plausibility caps; opt-out toggle; **`delete-account` Edge Function** (erasure).
- Light teacher tools: see class roster (alias ↔ real name), reset an alias, remove a student.
- **Done when:** opt-out, deletion, and basic moderation work; cheating envelope is narrow.

### Phase 6 — Test, polish, release
- Full test pass (§12), accessibility check on new pages, error/empty states, copy review (British English).
- Staged rollout to one class before wider release.

---

## 12. Testing strategy

- **Unit (Vitest):** `syncEngine` merge logic (max-XP, last-write-wins), migration via `importProgress`, **per-user cache namespacing + anonymous fallback on sign-out**, leaderboard sorting/tie-breaks, alias validation. These run without a network by mocking the Supabase client.
- **RLS/policy tests:** SQL-level tests proving a student cannot read another student's `progress`, email, or `full_name`; cannot write someone else's row; cannot self-promote to teacher; and that the `leaderboard` view never returns `full_name`/email. Also verify the anti-tamper trigger rejects an implausible `xp` jump. (Treat as a hard release gate.)
- **Integration:** auth happy-path + edge cases (non-school domain rejected, unverified login, duplicate alias, wrong join code, offline → online flush) against a Supabase test/branch project.
- **Manual:** two-device sync, offline play then reconnect, **shared-device sign-out (no leakage to next user)**, account deletion, leaderboard opt-out.

---

## 13. Risks, trade-offs & open questions

- **Cheating vs effort.** v1 deters casual tampering but isn't fully cheat-proof; client still computes XP. *Mitigation/escalation:* if it becomes a problem, move to server-authoritative scoring — submit append-only answer events and recompute XP in a Postgres function / Edge Function. Larger build; deferred.
- **Anon key exposure.** Safe *only* if RLS is right. *Mitigation:* RLS + policy tests are a hard release gate.
- **Wellbeing of low-ranked students.** *Mitigation:* lead with personal-best, optional opt-out, show nearby ranks.
- **Sync conflicts / lost progress fears.** *Mitigation:* max-merge so XP never goes backwards.
- **Free-tier limits / availability.** A class is well within data limits, but free projects **pause after ~7 days idle** (e.g. holidays); first request after may error until it resumes. *Mitigation:* app degrades to offline; consider a keep-alive or paid tier near exam season.
- **Email deliverability.** The built-in mailer throttles; a class signing up together will see verification emails fail. *Mitigation:* custom SMTP is a prerequisite for rollout (see §10/Phase 1) — treat as a release blocker, not a nice-to-have.
- **Shared-device privacy.** Local-first cache + "keep on sign-out" can leak one student's progress to the next on a shared lab PC. *Mitigation:* per-user cache namespacing + anonymous fallback on sign-out (see §6/Phase 3).
- **Scope creep into a teacher dashboard.** Genuinely useful (class mastery heatmaps, who's stuck) but its own project — keep out of v1.

**Decisions (resolved 21 June 2026):**
1. **Consent:** covered by the school setting; basic data (name + email) may be collected, no separate parental consent needed, no age/DOB collected.
2. **Signups:** restricted to the `@student.orbital.education` domain.
3. **Class admin:** Mr A Shah only for v1 (other staff can be added later).
4. **Leaderboards:** per teaching set **and** a global Year-group board (both built in v1).
5. **Sign-out:** keeps the local cache for offline play; server stays the source of truth.

No open questions remain — the plan is ready to build.

---

## 14. Rough effort estimate

| Phase | Indicative size |
|---|---|
| 0 — Foundations & sign-off | Small (mostly process) |
| 1 — Auth scaffolding | Small–Medium |
| 2 — Profiles & classes | Medium |
| 3 — Sync + migration | **Medium–Large** (the trickiest part) |
| 4 — Leaderboard | Medium |
| 5 — Hardening & admin | Medium |
| 6 — Test & release | Small–Medium |

The two areas to budget care for are **sync/merge (Phase 3)** and **RLS correctness (cross-cutting)** — they carry the most subtle bugs and the most risk if wrong.

---

## 15. Suggested first step

Get Phase 0 sign-off and stand up the Supabase project (I can scaffold the project, the three tables, RLS policies, and the leaderboard view as versioned migrations via the Supabase connector). Then Phase 1 auth can be built and demoed without touching any existing functionality.
