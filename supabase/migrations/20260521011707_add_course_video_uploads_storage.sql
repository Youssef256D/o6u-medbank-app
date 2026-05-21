begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'course-videos',
  'course-videos',
  false,
  524288000,
  array[
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-m4v'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists course_videos_admin_select on storage.objects;
drop policy if exists course_videos_student_select_visible_course on storage.objects;
drop policy if exists course_videos_admin_insert on storage.objects;
drop policy if exists course_videos_admin_update on storage.objects;
drop policy if exists course_videos_admin_delete on storage.objects;

create policy course_videos_admin_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'course-videos'
  and (select private.is_admin_user())
);

create policy course_videos_student_select_visible_course
on storage.objects
for select
to authenticated
using (
  bucket_id = 'course-videos'
  and (storage.foldername(name))[1] = 'courses'
  and coalesce((storage.foldername(name))[2], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and private.can_select_platform_course_by_id(((storage.foldername(name))[2])::uuid)
);

create policy course_videos_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'course-videos'
  and (storage.foldername(name))[1] = 'courses'
  and coalesce((storage.foldername(name))[2], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (select private.is_admin_user())
);

create policy course_videos_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'course-videos'
  and (select private.is_admin_user())
)
with check (
  bucket_id = 'course-videos'
  and (select private.is_admin_user())
);

create policy course_videos_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'course-videos'
  and (select private.is_admin_user())
);

commit;
