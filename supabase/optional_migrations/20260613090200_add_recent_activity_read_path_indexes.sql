-- OPTIONAL: Emergency indexes for high-IO recent activity/reporting and
-- cleanup paths.
--
-- These are additive and do not remove content, users, policies, or columns.
-- They support the current admin report pattern that filters/orders test
-- history by updated_at and the retention helper that deletes completed
-- activity sessions by ended_at.
--
-- Keep this outside supabase/migrations because Supabase CLI db push currently
-- runs in pipeline mode, which rejects CREATE INDEX CONCURRENTLY. Run these
-- statements manually in a SQL session that supports concurrent index builds,
-- during a low-traffic window.

set lock_timeout = '5s';
set statement_timeout = '0';

create index concurrently if not exists idx_test_history_entries_updated_at_recent
  on public.test_history_entries (updated_at desc);

create index concurrently if not exists idx_user_activity_sessions_ended_at_completed
  on public.user_activity_sessions (ended_at)
  where ended_at is not null;
