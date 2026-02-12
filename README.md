# O6U MedBank SQL Database

This folder contains a real relational PostgreSQL database setup for the MCQ platform.

## Files

- `schema.sql`: full production-style schema (tables, constraints, indexes, triggers, views)
- `seed.sql`: seed data for O6U users, curriculum courses, topics, enrollments, invites, and sample question data
- `supabase_app_state.sql`: canonical lightweight sync table used by current frontend (`app_state` + `storage_key`)
- `supabase_appstate_compat.sql`: compatibility migration for legacy setups that created `appstate` + `storagekey`
- `supabase_full_setup.sql`: one-shot Supabase setup (schema + seed + sync compatibility)
- `supabase_verify.sql`: post-setup verification queries for schema and sync write/read

## Quick start (PostgreSQL)

1. Create database:

```bash
createdb o6umedbank
```

2. Apply schema:

```bash
psql -d o6umedbank -f database/schema.sql
```

3. Seed data:

```bash
psql -d o6umedbank -f database/seed.sql
```

## Demo seeded accounts

- Admin email: `admin@o6umed.local` (password source in seed script: `admin123`)
- Student email: `student@o6umed.local` (password source in seed script: `student123`)

`seed.sql` stores hashed passwords using `pgcrypto` (`crypt(...)`).

## Core entities included

- Users and roles (`student`, `admin`)
- Courses by academic year/semester
- Course topics
- Enrollment mapping (student -> courses)
- Questions, answer choices, tags, and revisions
- Test blocks/sessions, block items, and responses
- Incorrect queue and flashcards
- Bulk import jobs and import errors
- Feedback and support messages
- Invite codes

## Notes

- This SQL setup is real and normalized, but your current frontend still reads from `localStorage`.
- Supabase sync bridge is now available for prototype persistence:
  - run `schema.sql` (full website tables)
  - run `seed.sql` (starter records)
  - run `supabase_appstate_compat.sql` (normalizes `appstate/storagekey` to `app_state/storage_key` if needed)
  - configure `supabase.config.js` with project URL and anon key
- Next step to fully use normalized schema is wiring full API/auth flows and replacing local-storage style JSON blobs with table-level CRUD.
