-- Rollback for:
--   supabase/migrations/20260613090200_drop_unused_read_churn_indexes.sql
--
-- WARNING: Recreating indexes concurrently is safer for live traffic but can
-- take time and consume disk IO while each index is built. Apply during a
-- low-traffic window if the dropped indexes are needed again.
--
-- CREATE INDEX CONCURRENTLY cannot run inside an explicit transaction block. If
-- your migration runner wraps every file in a transaction, run these statements
-- manually.

set lock_timeout = '5s';
set statement_timeout = '0';

create index concurrently if not exists app_state_updated_at_idx
  on public.app_state (updated_at desc);

create index concurrently if not exists idx_test_history_entries_course_completed
  on public.test_history_entries (course_id, completed_at desc);

create index concurrently if not exists idx_test_history_entries_user_completed
  on public.test_history_entries (user_id, completed_at desc, updated_at desc);

create index concurrently if not exists idx_user_activity_sessions_user_started_at
  on public.user_activity_sessions (user_id, started_at desc);

create index concurrently if not exists idx_user_activity_sessions_last_seen_at
  on public.user_activity_sessions (last_seen_at desc);
