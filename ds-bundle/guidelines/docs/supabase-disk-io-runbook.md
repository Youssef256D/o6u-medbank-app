# Supabase Disk IO Reduction Runbook

## Pre-checks

Run `supabase/diagnostics/disk_io_diagnostics.sql` before deploying. Save the output for comparison.

Confirm these points before dropping indexes:

- The five candidate indexes still have `idx_scan = 0` over a meaningful traffic window.
- No scheduled reports, admin views, or support workflows depend on rare queries that use those indexes.
- `public.user_activity_sessions` has elevated `n_dead_tup` or dead tuple percentage.
- `pg_stat_statements` still shows the hottest IO queries hitting `public.app_state` or `public.test_history_entries`.
- There is a low-traffic window available for the concurrent index drops.

## Deploy Order

1. Apply `supabase/migrations/20260613090000_tune_hot_table_autovacuum.sql`.
2. Apply `supabase/migrations/20260613090100_add_user_activity_sessions_retention_helper.sql`.
3. Deploy the frontend throttling changes in `main.js`.

The read-path indexes in `supabase/optional_migrations/20260613090200_add_recent_activity_read_path_indexes.sql` use `CREATE INDEX CONCURRENTLY`. Keep them out of normal `supabase db push` because the CLI can reject concurrent index builds in pipeline mode. Run them manually from a SQL session that supports concurrent index builds, during a low-traffic window.

Do not enable the optional pg_cron cleanup until the retention window and expected delete volume are confirmed.

Do not apply `supabase/optional_migrations/20260613090200_drop_unused_read_churn_indexes.sql` during the emergency stabilization deploy. Keep it as a later, low-traffic cleanup step only after post-checks confirm the site is stable and the candidate indexes are still unused.

## Post-check Validation

Run `supabase/diagnostics/disk_io_diagnostics.sql` again after deploy and after at least one normal traffic period.

Useful focused checks:

```sql
select
  schemaname,
  relname,
  n_live_tup,
  n_dead_tup,
  last_autovacuum,
  last_autoanalyze
from pg_stat_user_tables
where schemaname = 'public'
  and relname in ('user_activity_sessions', 'test_history_entries');
```

```sql
select
  schemaname,
  relname,
  indexrelname,
  idx_scan
from pg_stat_user_indexes
where schemaname = 'public'
  and indexrelname in (
    'app_state_updated_at_idx',
    'idx_test_history_entries_course_completed',
    'idx_test_history_entries_user_completed',
    'idx_user_activity_sessions_user_started_at',
    'idx_user_activity_sessions_last_seen_at'
  );
```

```sql
select public.delete_old_user_activity_sessions(30) as deleted_sessions;
```

Only run the retention helper manually when you are ready to delete completed sessions older than the chosen retention window.

## Quick Revert

Rollback scripts are intentionally kept outside `supabase/migrations` so they are not applied by normal forward migration pushes.

To restore the dropped indexes, run:

```sql
-- supabase/rollbacks/20260613090200_recreate_unused_read_churn_indexes.sql
```

To remove the added read-path indexes, run:

```sql
-- supabase/rollbacks/20260613090200_drop_recent_activity_read_path_indexes.sql
```

To remove the retention helper, run:

```sql
-- supabase/rollbacks/20260613090100_drop_user_activity_sessions_retention_helper.sql
```

To reset the table-level autovacuum overrides, run:

```sql
-- supabase/rollbacks/20260613090000_reset_hot_table_autovacuum.sql
```

After any rollback, rerun the diagnostics and compare query latency, disk reads/writes, dead tuples, and index usage.
