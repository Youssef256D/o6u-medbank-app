begin;

do $$
begin
  if to_regclass('public.user_course_enrollments') is not null then
    execute 'alter table public.user_course_enrollments enable row level security';

    execute 'drop policy if exists enrollments_insert on public.user_course_enrollments';
    execute 'drop policy if exists enrollments_update on public.user_course_enrollments';
    execute 'drop policy if exists enrollments_delete on public.user_course_enrollments';

    execute $policy$
      create policy enrollments_insert
        on public.user_course_enrollments
        for insert
        to authenticated
        with check (
          user_id = (select auth.uid())
          or (select public.is_admin_user())
        )
    $policy$;

    execute $policy$
      create policy enrollments_update
        on public.user_course_enrollments
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
      create policy enrollments_delete
        on public.user_course_enrollments
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
