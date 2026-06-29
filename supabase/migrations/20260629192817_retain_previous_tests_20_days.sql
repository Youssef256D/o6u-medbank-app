create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create or replace function public.delete_old_test_history_entries(
  p_retention_days integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cutoff timestamptz;
  v_deleted_history_count bigint := 0;
  v_pruned_backup_session_count bigint := 0;
  v_updated_backup_row_count bigint := 0;
begin
  if p_retention_days is null or p_retention_days < 1 then
    raise exception 'p_retention_days must be at least 1';
  end if;

  if p_retention_days > 3650 then
    raise exception 'p_retention_days must be 3650 days or less';
  end if;

  v_cutoff := now() - make_interval(days => p_retention_days);

  delete from public.test_history_entries
  where completed_at < v_cutoff;

  get diagnostics v_deleted_history_count = row_count;

  with session_state as (
    select
      storage_key,
      payload
    from public.app_state
    where jsonb_typeof(payload) = 'array'
      and (
        storage_key = 'mcq_sessions'
        or (
          split_part(storage_key, ':', 1) = 'u'
          and split_part(storage_key, ':', 3) = 'mcq_sessions'
        )
      )
  ),
  expanded as (
    select
      s.storage_key,
      item.value as session,
      item.ordinality,
      coalesce(item.value ->> 'status', '') as status,
      coalesce(item.value ->> 'previousStatus', '') as previous_status,
      coalesce(
        case
          when coalesce(item.value ->> 'completedAt', '') ~ '^\d{4}-\d{2}-\d{2}'
          then (item.value ->> 'completedAt')::timestamptz
          else null
        end,
        case
          when coalesce(item.value ->> 'updatedAt', '') ~ '^\d{4}-\d{2}-\d{2}'
          then (item.value ->> 'updatedAt')::timestamptz
          else null
        end,
        case
          when coalesce(item.value ->> 'createdAt', '') ~ '^\d{4}-\d{2}-\d{2}'
          then (item.value ->> 'createdAt')::timestamptz
          else null
        end
      ) as history_at
    from session_state s
    cross join lateral jsonb_array_elements(s.payload) with ordinality as item(value, ordinality)
    where jsonb_typeof(item.value) = 'object'
  ),
  classified as (
    select
      storage_key,
      session,
      ordinality,
      (
        status = 'completed'
        or (status = 'suspended' and previous_status = 'completed')
      ) as is_previous_test,
      history_at
    from expanded
  ),
  retained as (
    select
      storage_key,
      coalesce(
        jsonb_agg(session order by ordinality) filter (
          where not (
            is_previous_test
            and history_at is not null
            and history_at < v_cutoff
          )
        ),
        '[]'::jsonb
      ) as next_payload,
      count(*) filter (
        where is_previous_test
          and history_at is not null
          and history_at < v_cutoff
      ) as pruned_count
    from classified
    group by storage_key
  ),
  updated as (
    update public.app_state target
    set
      payload = retained.next_payload,
      updated_at = now()
    from retained
    where target.storage_key = retained.storage_key
      and target.payload is distinct from retained.next_payload
    returning retained.pruned_count
  )
  select
    coalesce(sum(pruned_count), 0),
    count(*)
  into v_pruned_backup_session_count, v_updated_backup_row_count
  from updated;

  return jsonb_build_object(
    'retention_days', p_retention_days,
    'cutoff', v_cutoff,
    'deleted_test_history_entries', v_deleted_history_count,
    'pruned_app_state_sessions', v_pruned_backup_session_count,
    'updated_app_state_rows', v_updated_backup_row_count
  );
end;
$$;

comment on function public.delete_old_test_history_entries(integer)
is 'Deletes previous-test history older than the retention window and prunes matching mcq_sessions app_state backups.';

revoke all on function public.delete_old_test_history_entries(integer) from public;
grant execute on function public.delete_old_test_history_entries(integer) to service_role;

select public.delete_old_test_history_entries(20);

select cron.schedule(
  'medbank-delete-old-test-history',
  '17 2 * * *',
  $$select public.delete_old_test_history_entries(20);$$
);
