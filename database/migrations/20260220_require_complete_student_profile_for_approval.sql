-- Applied migration name: require_complete_student_profile_for_approval
-- Date: 2026-02-20

-- Safety pass: students missing phone/year/semester cannot stay approved.
update public.profiles
set approved = false
where role = 'student'
  and (
    academic_year is null
    or academic_semester is null
    or length(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')) < 8
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_student_approved_requires_completion_ck'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_student_approved_requires_completion_ck
      check (
        role <> 'student'
        or approved = false
        or (
          academic_year between 1 and 5
          and academic_semester in (1, 2)
          and length(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')) >= 8
        )
      );
  end if;
end
$$;
