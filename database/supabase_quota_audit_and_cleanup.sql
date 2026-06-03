-- Supabase quota triage for O6U MedBank.
-- Run the audit sections first in the Supabase SQL Editor.
-- The cleanup section is intentionally commented out until the largest tables are confirmed.

-- 1) Database size summary.
select
  pg_size_pretty(pg_database_size(current_database())) as database_size;

-- 2) Largest public tables and indexes.
select
  schemaname,
  relname as table_name,
  n_live_tup as estimated_rows,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size,
  pg_size_pretty(pg_relation_size(relid)) as table_size,
  pg_size_pretty(pg_indexes_size(relid)) as index_size
from pg_stat_user_tables
where schemaname = 'public'
order by pg_total_relation_size(relid) desc
limit 30;

-- 3) Dead tuple pressure. High values mean VACUUM/ANALYZE may help after cleanup.
select
  schemaname,
  relname as table_name,
  n_live_tup as estimated_live_rows,
  n_dead_tup as estimated_dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
from pg_stat_user_tables
where schemaname = 'public'
order by n_dead_tup desc
limit 30;

-- 4) Biggest app_state JSON rows. These are often old duplicated localStorage backups.
select
  storage_key,
  updated_at,
  pg_size_pretty(pg_column_size(payload)::bigint) as payload_size
from public.app_state
order by pg_column_size(payload) desc
limit 50;

-- 5) app_state size by key family.
select
  case
    when storage_key like 'u:%' then split_part(storage_key, ':', 3)
    when storage_key like 'g:%' then split_part(storage_key, ':', 2)
    else storage_key
  end as key_family,
  count(*) as rows,
  pg_size_pretty(sum(pg_column_size(payload))::bigint) as payload_size
from public.app_state
group by 1
order by sum(pg_column_size(payload)) desc;

-- 6) Test history footprint. Large payloads here are safe to trim only if old attempts
-- are no longer needed for student review/analytics.
select
  count(*) as rows,
  pg_size_pretty(coalesce(sum(pg_column_size(payload)), 0)::bigint) as payload_size,
  min(completed_at) as oldest_completed_at,
  max(completed_at) as newest_completed_at
from public.test_history_entries;

select
  user_id,
  count(*) as rows,
  pg_size_pretty(coalesce(sum(pg_column_size(payload)), 0)::bigint) as payload_size,
  min(completed_at) as oldest_completed_at,
  max(completed_at) as newest_completed_at
from public.test_history_entries
group by user_id
order by sum(pg_column_size(payload)) desc
limit 30;

-- 7) Activity/session logs. Usually easy to prune.
select
  count(*) as rows,
  min(started_at) as oldest_started_at,
  max(started_at) as newest_started_at
from public.user_activity_sessions;

-- 8) Storage object metadata by bucket. The screenshot says Storage is tiny, but
-- this confirms bucket usage if storage.objects is contributing metadata rows.
select
  bucket_id,
  count(*) as objects,
  pg_size_pretty(coalesce(sum(metadata_size), 0)::bigint) as metadata_size,
  pg_size_pretty(coalesce(sum(object_size), 0)::bigint) as object_size
from (
  select
    bucket_id,
    pg_column_size(metadata)::bigint as metadata_size,
    coalesce((metadata ->> 'size')::bigint, 0) as object_size
  from storage.objects
) objects
group by bucket_id
order by sum(object_size) desc;

-- Cleanup candidates.
-- Read the audit output first. Then uncomment only the cleanup that matches the
-- table actually consuming quota.

-- A) Remove old per-user legacy session backups from app_state after relational
-- test_history_entries has the real history. This preserves recent rows.
--
-- begin;
-- delete from public.app_state
-- where storage_key like 'u:%:mcq_sessions'
--   and updated_at < now() - interval '30 days';
-- vacuum (analyze) public.app_state;
-- commit;

-- B) Keep only each student's latest 50 completed test-history snapshots.
-- This reduces old review/analytics detail, so confirm before running.
--
-- begin;
-- with ranked as (
--   select
--     id,
--     row_number() over (
--       partition by user_id
--       order by completed_at desc, updated_at desc
--     ) as row_number
--   from public.test_history_entries
-- )
-- delete from public.test_history_entries h
-- using ranked r
-- where h.id = r.id
--   and r.row_number > 50;
-- vacuum (analyze) public.test_history_entries;
-- commit;

-- C) Remove activity sessions older than 30 days.
--
-- begin;
-- delete from public.user_activity_sessions
-- where started_at < now() - interval '30 days';
-- vacuum (analyze) public.user_activity_sessions;
-- commit;

