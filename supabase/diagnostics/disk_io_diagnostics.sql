-- Disk IO diagnostics for Supabase Postgres.
--
-- Run before and after the migrations to compare query IO, dead tuples, and
-- index usage. pg_stat_statements must be enabled for the first report.
-- Supabase usually installs it in the extensions schema.

-- 1) Top queries by shared read/write pressure.
select
  s.queryid,
  s.calls,
  round(s.total_exec_time::numeric, 2) as total_exec_time_ms,
  round(s.mean_exec_time::numeric, 2) as mean_exec_time_ms,
  s.rows,
  s.shared_blks_hit,
  s.shared_blks_read,
  s.shared_blks_dirtied,
  s.shared_blks_written,
  s.temp_blks_read,
  s.temp_blks_written,
  left(regexp_replace(s.query, '[[:space:]]+', ' ', 'g'), 500) as query_sample
from extensions.pg_stat_statements as s
order by (
  s.shared_blks_read
  + s.shared_blks_dirtied
  + s.shared_blks_written
  + s.temp_blks_read
  + s.temp_blks_written
) desc
limit 25;

-- 2) Table churn/dead tuple check.
select
  t.schemaname,
  t.relname,
  t.n_live_tup,
  t.n_dead_tup,
  round(
    (100.0 * t.n_dead_tup / nullif(t.n_live_tup + t.n_dead_tup, 0))::numeric,
    2
  ) as dead_tuple_pct,
  t.vacuum_count,
  t.autovacuum_count,
  t.analyze_count,
  t.autoanalyze_count,
  t.last_vacuum,
  t.last_autovacuum,
  t.last_analyze,
  t.last_autoanalyze
from pg_stat_user_tables as t
where t.schemaname = 'public'
  and t.relname in (
    'app_state',
    'test_history_entries',
    'user_activity_sessions'
  )
order by t.n_dead_tup desc;

-- 3) Index usage check, with the candidate indexes highlighted.
select
  i.schemaname,
  i.relname as table_name,
  i.indexrelname as index_name,
  i.idx_scan,
  i.idx_tup_read,
  i.idx_tup_fetch,
  pg_size_pretty(pg_relation_size(i.indexrelid)) as index_size,
  pg_get_indexdef(i.indexrelid) as index_definition,
  case
    when i.indexrelname in (
      'app_state_updated_at_idx',
      'idx_test_history_entries_course_completed',
      'idx_test_history_entries_user_completed',
      'idx_user_activity_sessions_user_started_at',
      'idx_user_activity_sessions_last_seen_at'
    ) then true
    else false
  end as was_drop_candidate
from pg_stat_user_indexes as i
where i.schemaname = 'public'
  and (
    i.relname in (
      'app_state',
      'test_history_entries',
      'user_activity_sessions'
    )
    or i.indexrelname in (
      'app_state_updated_at_idx',
      'idx_test_history_entries_course_completed',
      'idx_test_history_entries_user_completed',
      'idx_user_activity_sessions_user_started_at',
      'idx_user_activity_sessions_last_seen_at'
    )
  )
order by was_drop_candidate desc, i.idx_scan asc, pg_relation_size(i.indexrelid) desc;
