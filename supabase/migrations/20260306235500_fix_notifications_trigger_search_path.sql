-- Applied migration name: fix_notifications_trigger_search_path
-- Date: 2026-03-06

begin;

create or replace function public.set_notifications_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

commit;
