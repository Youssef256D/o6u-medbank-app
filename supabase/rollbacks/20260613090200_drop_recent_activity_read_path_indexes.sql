-- Rollback for:
--   supabase/migrations/20260613090200_add_recent_activity_read_path_indexes.sql
--
-- DROP INDEX CONCURRENTLY cannot run inside an explicit transaction block. If
-- your migration runner wraps every file in a transaction, run these statements
-- manually during a low-traffic window.

set lock_timeout = '5s';
set statement_timeout = '0';

drop index concurrently if exists public.idx_test_history_entries_updated_at_recent;
drop index concurrently if exists public.idx_user_activity_sessions_ended_at_completed;
