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

Supabase sync is now wired (prototype mode) via:

- `/Users/youssefayoub/Documents/Apps/MCQs Website/supabase.config.js`
- table SQL: `/Users/youssefayoub/Documents/Apps/MCQs Website/database/supabase_app_state.sql`
- compatibility SQL: `/Users/youssefayoub/Documents/Apps/MCQs Website/database/supabase_appstate_compat.sql`

Notes:

- The frontend uses only `SUPABASE_URL` + `SUPABASE_ANON_KEY`.
- Do not put `SUPABASE_SERVICE_ROLE_KEY` in frontend files.
- Supabase Auth is used for sign up/login/reset email. Local demo users still work for quick testing.
- Sync keys now support scale-safe namespacing:
  - global keys: `g:<storage_key>`
  - user-scoped keys: `u:<auth.uid>:<storage_key>`

## Supabase Auth setup checklist

In Supabase Dashboard:

1. Authentication -> Providers -> Email: enable Email provider.
2. Authentication -> URL Configuration:
   - Site URL: your deployed URL
   - Redirect URLs: add your deployed URL and `http://localhost:5500` (or your local dev URL)
3. Enable leaked-password protection (recommended for production).
4. (Optional) Disable "Confirm email" during testing if you want instant login after sign-up.

## Publish to web

This project is static (`index.html` + `main.js` + `styles.css`), so GitHub Pages works.

Quick GitHub Pages steps:

1. Push the project to a GitHub repository.
2. Repo Settings -> Pages:
   - Source: Deploy from branch
   - Branch: `main` and `/ (root)`
3. Wait for Pages to publish, then open your site URL.
4. Put that URL into Supabase Authentication URL Configuration (Site URL + Redirect URLs).

Alternative hosts (often easier for env management): Netlify, Vercel, Cloudflare Pages.

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

This is still a frontend prototype UI. SQL database files are production-style, but API wiring is still needed.

1. Replace localStorage with a real backend + database.
2. Add secure auth (hashed passwords, email verification, reset tokens).
3. Add media upload/storage, moderation workflow, and version history.
4. Add server-side analytics aggregation and backup strategy.

## 2,000-user hardening (completed in this repo)

- Frontend sync now isolates high-churn user data (`sessions`, `incorrect queue`, `flashcards`) into user-scoped cloud keys.
- Supabase `app_state` RLS policies were migrated to support global/user-scoped key patterns.
- Duplicate index and RLS policy performance issues were resolved.
- Core relational tables were created in Supabase (`profiles`, `courses`, `course_topics`, `questions`, `question_choices`, `test_blocks`, `test_block_items`, `test_responses`) with indexes and RLS.

Applied Supabase migrations:

- `scale_app_state_keys_and_rls_for_2000_users`
- `optimize_app_state_rls_and_indexes`
- `create_core_relational_tables_for_2000_users`
