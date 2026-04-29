# O6U MedBank MVP Prototype

A dependency-free browser MVP for October 6 University Faculty of Medicine MCQ practice workflows.

## Run

Open `/Users/youssefayoub/Documents/Apps/MCQs Website/index.html` in your browser.

## Included MVP flows

- Public pages: Home, Features, Pricing, About, Contact + support form
- Auth: Sign up, Login, Forgot password via Supabase Auth (with local demo fallback)
- Create a test: choose assigned course + topic, set count, mode (`timed`/`tutor`), source (`all`/`unused`/`incorrect`/`flagged`), and randomization
- Attempt interface: select answers, flag, strike-through, notes, navigator, autosave, pause/resume timer
- Review: score summary, per-question explanation, add to incorrect queue
- Analytics: overall performance + topic breakdown + weak areas
- Profile: update account/email/password and view incorrect queue size
- Admin portal: assign courses to accounts, create/edit/delete/publish questions, and bulk import by course/topic

## Demo accounts

- Admin: `admin@o6umed.local` / `admin123`
- Student: `student@o6umed.local` / `student123`

## Data/storage

Current UI data is stored in browser `localStorage`.

Keys used:

- `mcq_users`
- `mcq_current_user_id`
- `mcq_questions`
- `mcq_sessions`
- `mcq_filter_presets`
- `mcq_incorrect_queue`
- `mcq_invites`
- `mcq_curriculum`
- `mcq_course_topics`

Supabase sync is now wired in a simplified two-layer model:

- `/Users/youssefayoub/Documents/Apps/MCQs Website/supabase.config.js`
- table SQL: `/Users/youssefayoub/Documents/Apps/MCQs Website/database/supabase_app_state.sql`
- compatibility SQL: `/Users/youssefayoub/Documents/Apps/MCQs Website/database/supabase_appstate_compat.sql`

Notes:

- The frontend uses only `SUPABASE_URL` + `SUPABASE_ANON_KEY`.
- Do not put `SUPABASE_SERVICE_ROLE_KEY` in frontend files.
- Supabase Auth is used for sign up/login/reset email. Local demo users still work for quick testing.
- Primary sync path: relational tables (`profiles`, `courses`, `course_topics`, `questions`, `test_blocks`, etc.).
- Legacy `app_state` sync path is now limited to non-relational settings/queues only (to avoid duplicate heavy writes and improve responsiveness).
- Sync keys now support scale-safe namespacing:
  - global keys: `g:<storage_key>`
  - user-scoped keys: `u:<auth.uid>:<storage_key>`

## Supabase connection method for this project

This repo now follows the Supabase connection guidance by role:

- Browser frontend (`index.html` + `bootstrap.js` + `main.js`):
  - use Supabase Data APIs through `supabase-js`
  - configured by `/Users/youssefayoub/Documents/Apps/MCQs Website/supabase.config.js`
  - required values: `SUPABASE_URL` and `SUPABASE_ANON_KEY`
  - do not use Postgres connection strings in the browser
- Server-side admin endpoints (`/api/*.js` and `supabase/functions/*`):
  - current implementation uses Supabase Auth/Admin HTTP APIs with `SUPABASE_SERVICE_ROLE_KEY`
  - no direct Postgres socket connection is opened by the current code
  - if you later add direct SQL from serverless functions, use the Supabase transaction pooler connection string and disable prepared statements in that client
- SQL tools / migrations / database GUIs:
  - use the direct connection string when your machine/network supports IPv6
  - otherwise use the session pooler as the fallback for long-lived GUI or backend sessions

Optional environment placeholders were added to `/Users/youssefayoub/Documents/Apps/MCQs Website/.env.example`:

- `SUPABASE_DB_DIRECT_URL`
- `SUPABASE_DB_SESSION_POOLER_URL`
- `SUPABASE_DB_TRANSACTION_POOLER_URL`

These are for tooling or future backend workers. The current frontend does not read them.

## Supabase Auth setup checklist

In Supabase Dashboard:

1. Authentication -> Providers:
   - Email: enable Email provider.
   - Google: enable Google provider and set authorized redirect/client settings in Supabase.
2. Authentication -> URL Configuration:
   - Site URL: your deployed URL
   - Redirect URLs: add your deployed URL, `http://localhost:5500` (or your local dev URL), and the mobile deep link `o6umedbank://auth/callback`
3. Enable leaked-password protection (recommended for production).
4. (Optional) Disable "Confirm email" during testing if you want instant login after sign-up.

## Supabase dashboard tasks still required

You still need to confirm these values in the Supabase project UI:

1. Project dashboard -> `Connect`
   - copy the project URL
   - copy the browser-safe publishable/anon key
   - copy the connection strings you actually need for tooling:
     - Direct connection
     - Session pooler
     - Transaction pooler
2. Authentication -> `URL Configuration`
   - set `Site URL` to your deployed frontend URL
   - add all valid redirect URLs used by this app
3. Authentication -> `Providers`
   - enable Email
   - enable Google only if you intend to keep Google sign-in active
4. SQL Editor
   - run `database/supabase_full_setup.sql` if the schema is not fully applied yet
   - or run the listed migration/setup files in order
5. Storage
   - create the `question-images` bucket if you want image upload to work
6. Edge Functions or hosting UI
   - if you deploy `supabase/functions/admin-delete-user` and `supabase/functions/admin-set-user-password`, set:
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `ALLOWED_ORIGIN`
   - if you host your own `/api` backend instead, set the same server env vars there

Recommended connection selection for your project UI choices:

- Use `Project URL` + `publishable/anon key` for this website frontend
- Use `Transaction pooler` only if you later add direct SQL inside serverless functions
- Use `Session pooler` for long-lived IPv4-only app servers
- Use `Direct connection` for SQL tools, migrations, pg_dump, and database GUIs when IPv6 works

## Publish to web

This project is static (`index.html` + `main.js` + `styles.css`), so GitHub Pages works.

### Safe pre-release workflow (recommended)

Use this to test everything before users see it:

1. Test locally first:

```bash
cd "/Users/youssefayoub/Documents/Apps/MCQs Website"
python3 -m http.server 4173
```

Open `http://localhost:4173` and verify the full flow as admin + student.

2. Push your branch. The `Validate Changes` GitHub Action now runs automatically on every push/PR.
3. Production is now manual-only. Nothing is published to GitHub Pages on push.
4. When you approve the result, run the workflow `Deploy GitHub Pages (Manual)` and deploy `main`.

Quick GitHub Pages steps:

1. Push the project to a GitHub repository.
2. Repo Settings -> Pages:
   - Source: Deploy from branch
   - Branch: `main` and `/ (root)`
3. Wait for Pages to publish, then open your site URL.
4. Put that URL into Supabase Authentication URL Configuration (Site URL + Redirect URLs).

Alternative hosts (often easier for env management): Netlify, Vercel, Cloudflare Pages.

## Server Functions (phase 1)

This repo now includes a backend function for sensitive admin actions:

- `/Users/youssefayoub/Documents/Apps/MCQs Website/api/admin-delete-user.js`
- `/Users/youssefayoub/Documents/Apps/MCQs Website/api/admin-set-user-password.js`
- shared helpers: `/Users/youssefayoub/Documents/Apps/MCQs Website/api/_supabase.js`

What it does:

- Verifies the caller's Supabase access token.
- Checks the caller role from `profiles` (`admin` only).
- Deletes target users via Supabase Admin API using `SUPABASE_SERVICE_ROLE_KEY` (server-side only).
- Updates target user passwords via Supabase Admin API using `SUPABASE_SERVICE_ROLE_KEY` (server-side only).

Required environment variables (server):

- `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`)
- `ALLOWED_ORIGIN` (optional, defaults to `*`)

Frontend config:

- `/Users/youssefayoub/Documents/Apps/MCQs Website/supabase.config.js` now supports `serverApiBaseUrl`.
- Default value is empty (`""`) for GitHub Pages/static deploys.
- For same-origin deploys with functions (for example, Vercel static + functions together), set it to `"/api"`.
- If frontend and API are on different domains, set a full URL (for example, `https://your-api.vercel.app/api`).

Local smoke run:

```bash
cp .env.example .env
vercel dev
```

### Supabase Edge Function fallback (no separate `/api` backend)

You can deploy these Edge Functions and keep `serverApiBaseUrl` empty:

- `/Users/youssefayoub/Documents/Apps/MCQs Website/supabase/functions/admin-delete-user/index.ts`
- `/Users/youssefayoub/Documents/Apps/MCQs Website/supabase/functions/admin-set-user-password/index.ts`

Deploy:

```bash
supabase functions deploy admin-delete-user
supabase functions deploy admin-set-user-password
```

Optional CORS allow-list (defaults to `*` if not set):

```bash
supabase secrets set ALLOWED_ORIGIN=https://your-site.example.com
```

How it works with this app:

- The frontend first tries `serverApiBaseUrl/admin-delete-user` and `serverApiBaseUrl/admin-set-user-password` if configured.
- If not available, it automatically falls back to:
  - `https://<project-ref>.supabase.co/functions/v1/admin-delete-user`
  - `https://<project-ref>.supabase.co/functions/v1/admin-set-user-password`

## Real SQL database (added)

A real PostgreSQL schema and seed setup is now included:

- `/Users/youssefayoub/Documents/Apps/MCQs Website/database/schema.sql`
- `/Users/youssefayoub/Documents/Apps/MCQs Website/database/seed.sql`
- `/Users/youssefayoub/Documents/Apps/MCQs Website/database/README.md`

Quick run:

```bash
createdb o6umedbank
psql -d o6umedbank -f database/schema.sql
psql -d o6umedbank -f database/seed.sql
```

Supabase SQL editor run order:

```sql
-- 1) Full website tables
--    run file: database/schema.sql

-- 2) Seed starter data
--    run file: database/seed.sql

-- 3) Sync table compatibility (handles appstate/storagekey and app_state/storage_key)
--    run file: database/supabase_appstate_compat.sql
```

Or run one file:

```sql
-- run file: database/supabase_full_setup.sql
```

Then verify:

```sql
-- run file: database/supabase_verify.sql
```

## Notes

This is still mostly a frontend prototype UI. SQL database files are production-style; server API wiring has started and should be expanded for other admin/data writes.

1. Replace localStorage with a real backend + database.
2. Add secure auth (hashed passwords, email verification, reset tokens).
3. Add media upload/storage, moderation workflow, and version history.
4. Add server-side analytics aggregation and backup strategy.

## 2,000-user hardening (completed in this repo)

- Frontend sync now isolates high-churn user data (`sessions`, `incorrect queue`, `flashcards`) into user-scoped cloud keys.
- Supabase `app_state` RLS policies were migrated to support global/user-scoped key patterns.
- Duplicate index and RLS policy performance issues were resolved.
- Core relational tables were created in Supabase (`profiles`, `courses`, `course_topics`, `questions`, `question_choices`, `test_blocks`, `test_block_items`, `test_responses`) with indexes and RLS.
- Phase-2 bridge is active: admin users/questions/tests and course/topic changes are persisted directly to relational tables (with local cache as UI state).

Applied Supabase migrations:

- `scale_app_state_keys_and_rls_for_2000_users`
- `optimize_app_state_rls_and_indexes`
- `create_core_relational_tables_for_2000_users`
- `add_external_ids_and_foreign_key_indexes`
