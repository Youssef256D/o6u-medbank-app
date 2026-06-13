-- Tune autovacuum/analyze for high-churn and high-read tables.
--
-- public.user_activity_sessions has high churn and dead tuples, so keep
-- thresholds low enough that cleanup runs before dead rows accumulate.
alter table public.user_activity_sessions set (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_vacuum_threshold = 50,
  autovacuum_analyze_scale_factor = 0.01,
  autovacuum_analyze_threshold = 50
);

-- public.test_history_entries is read-heavy and receives steady writes.
-- Use moderately aggressive analyze/vacuum settings to keep planner stats
-- fresh without making autovacuum too chatty.
alter table public.test_history_entries set (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_threshold = 100,
  autovacuum_analyze_scale_factor = 0.025,
  autovacuum_analyze_threshold = 100
);
