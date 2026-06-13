-- Rollback for:
--   supabase/migrations/20260613090100_add_user_activity_sessions_retention_helper.sql
--
-- If you manually scheduled the optional pg_cron job, unschedule it before
-- dropping the helper:
--
-- select cron.unschedule('delete-old-user-activity-sessions');

drop function if exists public.delete_old_user_activity_sessions(integer);
