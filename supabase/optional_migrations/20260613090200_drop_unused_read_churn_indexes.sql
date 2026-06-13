-- OPTIONAL: Potentially risky production change.
--
-- These indexes had idx_scan = 0 in the analysis snapshot, but an index can be
-- needed by rare admin/reporting paths or by traffic patterns not captured in
-- the observation window. Apply only after the emergency stabilization deploy,
-- during a low-traffic window, and keep the rollback script ready:
--   supabase/rollbacks/20260613090200_recreate_unused_read_churn_indexes.sql
--
-- DROP INDEX CONCURRENTLY avoids blocking table reads/writes, but it cannot run
-- inside an explicit transaction block. If your migration runner wraps every
-- file in a transaction, run these statements manually during the deploy.

set lock_timeout = '5s';
set statement_timeout = '0';

drop index concurrently if exists public.app_state_updated_at_idx;
drop index concurrently if exists public.idx_test_history_entries_course_completed;
drop index concurrently if exists public.idx_test_history_entries_user_completed;
drop index concurrently if exists public.idx_user_activity_sessions_user_started_at;
drop index concurrently if exists public.idx_user_activity_sessions_last_seen_at;
