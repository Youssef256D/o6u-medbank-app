create or replace function public.enforce_test_history_retention_window()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.completed_at < now() - interval '20 days' then
    return null;
  end if;

  return new;
end;
$$;

comment on function public.enforce_test_history_retention_window()
is 'Skips inserts/updates of previous-test history older than the 20-day retention window.';

drop trigger if exists trg_test_history_entries_retention_window on public.test_history_entries;
create trigger trg_test_history_entries_retention_window
before insert or update on public.test_history_entries
for each row
execute function public.enforce_test_history_retention_window();

select public.delete_old_test_history_entries(20);
