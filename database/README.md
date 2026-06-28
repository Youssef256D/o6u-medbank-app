# MedBank Hosted Database Notes

The production database for this app is the hosted Supabase project. This folder keeps older SQL reference files, but the website runtime does not depend on a local PostgreSQL or local Supabase instance.

## Current Source Of Truth

- Hosted Supabase project: `https://fzjzjzdamehxbgikiskt.supabase.co`
- Runtime config: `/Users/youssefayoub/Documents/Apps/MCQs Website/supabase.config.js`
- Active migrations: `/Users/youssefayoub/Documents/Apps/MCQs Website/supabase/migrations`

## How To Apply Database Changes

Use the Supabase migration files against the hosted project only:

```bash
supabase db push --dns-resolver https
```

Do not use this folder to start a local database for student/admin usage. The deployed GitHub Pages site talks to hosted Supabase directly.

## Legacy Reference Files

These files remain as reference snapshots for older setup/history work:

- `schema.sql`
- `seed.sql`
- `supabase_app_state.sql`
- `supabase_appstate_compat.sql`
- `supabase_full_setup.sql`
- `supabase_verify.sql`
- `migrations/*.sql`

Prefer the timestamped migrations in `/Users/youssefayoub/Documents/Apps/MCQs Website/supabase/migrations` for current database work.
