-- Rollback for:
--   supabase/migrations/20260613090000_tune_hot_table_autovacuum.sql
--
-- Restores default relation-level autovacuum/analyze settings by removing the
-- table-specific overrides.
alter table public.user_activity_sessions reset (
  autovacuum_vacuum_scale_factor,
  autovacuum_vacuum_threshold,
  autovacuum_analyze_scale_factor,
  autovacuum_analyze_threshold
);

alter table public.test_history_entries reset (
  autovacuum_vacuum_scale_factor,
  autovacuum_vacuum_threshold,
  autovacuum_analyze_scale_factor,
  autovacuum_analyze_threshold
);
