-- Retention helper for completed activity sessions.
--
-- This function is intentionally not scheduled here. Review the runbook before
-- enabling any recurring cleanup job.
create or replace function public.delete_old_user_activity_sessions(
  p_retention_days integer default 30
)
returns bigint
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_deleted_count bigint;
  v_cutoff timestamptz;
begin
  if p_retention_days is null or p_retention_days < 1 then
    raise exception 'p_retention_days must be at least 1';
  end if;

  if p_retention_days > 3650 then
    raise exception 'p_retention_days must be 3650 days or less';
  end if;

  v_cutoff := now() - make_interval(days => p_retention_days);

  delete from public.user_activity_sessions
  where public.user_activity_sessions.ended_at is not null
    and public.user_activity_sessions.ended_at < v_cutoff;

  get diagnostics v_deleted_count = row_count;
  return v_deleted_count;
end;
$$;

comment on function public.delete_old_user_activity_sessions(integer)
is 'Deletes completed user activity sessions whose ended_at is older than the retention window. Not scheduled automatically.';

revoke all on function public.delete_old_user_activity_sessions(integer) from public;
grant execute on function public.delete_old_user_activity_sessions(integer) to service_role;

-- Optional pg_cron schedule. Do not uncomment until you have confirmed the
-- retention window, expected delete volume, and low-traffic execution time.
--
-- select cron.schedule(
--   'delete-old-user-activity-sessions',
--   '17 2 * * *',
--   $$select public.delete_old_user_activity_sessions(30);$$
-- );
