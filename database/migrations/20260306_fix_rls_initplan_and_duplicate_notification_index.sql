-- Applied migration name: fix_rls_initplan_and_duplicate_notification_index
-- Date: 2026-03-06

begin;

drop index if exists public.idx_notifications_external_id;

do $$
begin
  if to_regclass('public.user_course_enrollments') is not null then
    execute 'alter table public.user_course_enrollments enable row level security';

    execute 'drop policy if exists enrollments_select on public.user_course_enrollments';
    execute $policy$
      create policy enrollments_select
        on public.user_course_enrollments
        for select
        to authenticated
        using (
          user_id = (select auth.uid())
          or (select public.is_admin_user())
        )
    $policy$;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.notifications') is not null then
    execute 'alter table public.notifications enable row level security';

    execute 'drop policy if exists notifications_select on public.notifications';
    execute $policy$
      create policy notifications_select
        on public.notifications
        for select
        to authenticated
        using (
          (select public.is_admin_user())
          or (
            is_active = true
            and (
              recipient_user_id is null
              or recipient_user_id = (select auth.uid())
            )
          )
        )
    $policy$;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.notification_reads') is not null then
    execute 'alter table public.notification_reads enable row level security';

    execute 'drop policy if exists notification_reads_select on public.notification_reads';
    execute 'drop policy if exists notification_reads_insert on public.notification_reads';
    execute 'drop policy if exists notification_reads_update on public.notification_reads';
    execute 'drop policy if exists notification_reads_delete on public.notification_reads';

    execute $policy$
      create policy notification_reads_select
        on public.notification_reads
        for select
        to authenticated
        using (
          user_id = (select auth.uid())
          or (select public.is_admin_user())
        )
    $policy$;

    execute $policy$
      create policy notification_reads_insert
        on public.notification_reads
        for insert
        to authenticated
        with check (
          user_id = (select auth.uid())
          or (select public.is_admin_user())
        )
    $policy$;

    execute $policy$
      create policy notification_reads_update
        on public.notification_reads
        for update
        to authenticated
        using (
          user_id = (select auth.uid())
          or (select public.is_admin_user())
        )
        with check (
          user_id = (select auth.uid())
          or (select public.is_admin_user())
        )
    $policy$;

    execute $policy$
      create policy notification_reads_delete
        on public.notification_reads
        for delete
        to authenticated
        using (
          user_id = (select auth.uid())
          or (select public.is_admin_user())
        )
    $policy$;
  end if;
end
$$;

commit;
