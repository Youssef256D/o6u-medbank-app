begin;

-- Public buckets can serve known object URLs without a broad SELECT policy.
-- Keep authenticated owner/admin reads for signed URL generation and dashboard
-- maintenance, but stop anonymous clients from listing every object.
drop policy if exists question_images_select on storage.objects;
drop policy if exists question_images_owner_admin_select on storage.objects;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;
grant usage on schema private to service_role;

do $$
begin
  if to_regprocedure('public.is_admin_user()') is not null
     and to_regprocedure('private.is_admin_user()') is null then
    alter function public.is_admin_user() set schema private;
  end if;
end
$$;

revoke all on function private.is_admin_user() from public;
revoke all on function private.is_admin_user() from anon;
grant execute on function private.is_admin_user() to authenticated;
grant execute on function private.is_admin_user() to service_role;

-- Refresh policies flagged by auth_rls_initplan so auth/admin checks are
-- evaluated as initplans instead of once per candidate row.
drop policy if exists blocks_delete on public.test_blocks;
create policy blocks_delete
on public.test_blocks
for delete
to authenticated
using ((select private.is_admin_user()));

drop policy if exists items_insert on public.test_block_items;
drop policy if exists items_update on public.test_block_items;
drop policy if exists items_delete on public.test_block_items;

create policy items_insert
on public.test_block_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_block_items.block_id
      and (
        b.user_id = (select auth.uid())
        or (select private.is_admin_user())
      )
  )
);

create policy items_update
on public.test_block_items
for update
to authenticated
using (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_block_items.block_id
      and (
        b.user_id = (select auth.uid())
        or (select private.is_admin_user())
      )
  )
)
with check (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_block_items.block_id
      and (
        b.user_id = (select auth.uid())
        or (select private.is_admin_user())
      )
  )
);

create policy items_delete
on public.test_block_items
for delete
to authenticated
using ((select private.is_admin_user()));

drop policy if exists responses_insert on public.test_responses;
drop policy if exists responses_update on public.test_responses;
drop policy if exists responses_delete on public.test_responses;

create policy responses_insert
on public.test_responses
for insert
to authenticated
with check (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_responses.block_id
      and (
        b.user_id = (select auth.uid())
        or (select private.is_admin_user())
      )
  )
);

create policy responses_update
on public.test_responses
for update
to authenticated
using (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_responses.block_id
      and (
        b.user_id = (select auth.uid())
        or (select private.is_admin_user())
      )
  )
)
with check (
  exists (
    select 1
    from public.test_blocks b
    where b.id = test_responses.block_id
      and (
        b.user_id = (select auth.uid())
        or (select private.is_admin_user())
      )
  )
);

create policy responses_delete
on public.test_responses
for delete
to authenticated
using ((select private.is_admin_user()));

drop policy if exists user_activity_sessions_select on public.user_activity_sessions;
drop policy if exists user_activity_sessions_insert on public.user_activity_sessions;
drop policy if exists user_activity_sessions_update on public.user_activity_sessions;
drop policy if exists user_activity_sessions_delete on public.user_activity_sessions;

create policy user_activity_sessions_select
on public.user_activity_sessions
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_admin_user())
);

create policy user_activity_sessions_insert
on public.user_activity_sessions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  or (select private.is_admin_user())
);

create policy user_activity_sessions_update
on public.user_activity_sessions
for update
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_admin_user())
)
with check (
  user_id = (select auth.uid())
  or (select private.is_admin_user())
);

create policy user_activity_sessions_delete
on public.user_activity_sessions
for delete
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_admin_user())
);

create policy question_images_owner_admin_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'question-images'
  and (
    owner = (select auth.uid())
    or (select private.is_admin_user())
  )
);

-- Trigger-only and maintenance SECURITY DEFINER functions should not be
-- callable through PostgREST RPC by anon/authenticated clients.
revoke all on function public.bootstrap_profile_from_auth_user_row() from public;
revoke all on function public.bootstrap_profile_from_auth_user_row() from anon;
revoke all on function public.bootstrap_profile_from_auth_user_row() from authenticated;

revoke all on function public.handle_auth_user_created() from public;
revoke all on function public.handle_auth_user_created() from anon;
revoke all on function public.handle_auth_user_created() from authenticated;

revoke all on function public.rls_auto_enable() from public;
revoke all on function public.rls_auto_enable() from anon;
revoke all on function public.rls_auto_enable() from authenticated;

revoke all on function public.sync_profile_from_auth_user(uuid) from public;
revoke all on function public.sync_profile_from_auth_user(uuid) from anon;
revoke all on function public.sync_profile_from_auth_user(uuid) from authenticated;

alter function public.set_updated_at() security invoker;
revoke all on function public.set_updated_at() from public;
revoke all on function public.set_updated_at() from anon;
revoke all on function public.set_updated_at() from authenticated;

alter function public.set_user_presence_updated_at() security invoker;
revoke all on function public.set_user_presence_updated_at() from public;
revoke all on function public.set_user_presence_updated_at() from anon;
revoke all on function public.set_user_presence_updated_at() from authenticated;

commit;
