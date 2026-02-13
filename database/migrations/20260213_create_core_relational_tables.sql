-- Applied migration name: create_core_relational_tables_for_2000_users
-- Date: 2026-02-13

create extension if not exists pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_user_role') THEN
    CREATE TYPE public.app_user_role AS ENUM ('student', 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_question_status') THEN
    CREATE TYPE public.app_question_status AS ENUM ('draft', 'published', 'archived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_block_mode') THEN
    CREATE TYPE public.app_block_mode AS ENUM ('tutor', 'timed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_block_source') THEN
    CREATE TYPE public.app_block_source AS ENUM ('all', 'unused', 'incorrect', 'flagged');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_block_status') THEN
    CREATE TYPE public.app_block_status AS ENUM ('in_progress', 'completed', 'suspended');
  END IF;
END
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  role public.app_user_role not null default 'student',
  approved boolean not null default false,
  academic_year smallint,
  academic_semester smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_year_ck check (academic_year is null or (academic_year between 1 and 5)),
  constraint profiles_semester_ck check (academic_semester is null or academic_semester in (1,2))
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  course_code text,
  course_name text not null,
  academic_year smallint not null check (academic_year between 1 and 5),
  academic_semester smallint not null check (academic_semester in (1,2)),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_name_year_sem_uniq unique (course_name, academic_year, academic_semester)
);

create table if not exists public.course_topics (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  topic_name text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_topics_name_per_course_uniq unique (course_id, topic_name)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  topic_id uuid not null references public.course_topics(id) on delete restrict,
  author_id uuid references public.profiles(id) on delete set null,
  stem text not null,
  explanation text not null,
  objective text,
  difficulty smallint not null default 2 check (difficulty between 1 and 3),
  status public.app_question_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  choice_label text not null check (choice_label in ('A','B','C','D','E')),
  choice_text text not null,
  is_correct boolean not null default false,
  constraint question_choice_label_uniq unique (question_id, choice_label)
);

create table if not exists public.test_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  mode public.app_block_mode not null,
  source public.app_block_source not null,
  status public.app_block_status not null default 'in_progress',
  question_count integer not null check (question_count > 0),
  duration_minutes integer,
  time_remaining_sec integer,
  current_index integer not null default 0,
  elapsed_seconds integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.test_block_items (
  block_id uuid not null references public.test_blocks(id) on delete cascade,
  position integer not null check (position > 0),
  question_id uuid not null references public.questions(id) on delete restrict,
  primary key (block_id, position),
  constraint test_block_item_unique_question unique (block_id, question_id)
);

create table if not exists public.test_responses (
  block_id uuid not null,
  question_id uuid not null,
  selected_choice_labels text[] not null default '{}'::text[],
  flagged boolean not null default false,
  notes text,
  submitted boolean not null default false,
  answered_at timestamptz,
  primary key (block_id, question_id),
  foreign key (block_id, question_id)
    references public.test_block_items(block_id, question_id)
    on delete cascade
);

create index if not exists idx_profiles_role_approved on public.profiles(role, approved);
create index if not exists idx_courses_year_sem on public.courses(academic_year, academic_semester);
create index if not exists idx_course_topics_course_sort on public.course_topics(course_id, sort_order);
create index if not exists idx_questions_course_topic_status on public.questions(course_id, topic_id, status);
create index if not exists idx_test_blocks_user_status_updated on public.test_blocks(user_id, status, updated_at desc);
create index if not exists idx_test_block_items_question on public.test_block_items(question_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_courses_updated_at ON public.courses;
CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_course_topics_updated_at ON public.course_topics;
CREATE TRIGGER trg_course_topics_updated_at BEFORE UPDATE ON public.course_topics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_questions_updated_at ON public.questions;
CREATE TRIGGER trg_questions_updated_at BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_test_blocks_updated_at ON public.test_blocks;
CREATE TRIGGER trg_test_blocks_updated_at BEFORE UPDATE ON public.test_blocks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.approved = true
  );
$$;

grant execute on function public.is_admin_user() to authenticated;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_topics enable row level security;
alter table public.questions enable row level security;
alter table public.question_choices enable row level security;
alter table public.test_blocks enable row level security;
alter table public.test_block_items enable row level security;
alter table public.test_responses enable row level security;

DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;
DROP POLICY IF EXISTS profiles_delete ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin_user());
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_admin_user());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin_user()) WITH CHECK (id = auth.uid() OR public.is_admin_user());
CREATE POLICY profiles_delete ON public.profiles FOR DELETE TO authenticated USING (public.is_admin_user());

DROP POLICY IF EXISTS courses_select ON public.courses;
DROP POLICY IF EXISTS courses_write ON public.courses;
CREATE POLICY courses_select ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY courses_write ON public.courses FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS topics_select ON public.course_topics;
DROP POLICY IF EXISTS topics_write ON public.course_topics;
CREATE POLICY topics_select ON public.course_topics FOR SELECT TO authenticated USING (true);
CREATE POLICY topics_write ON public.course_topics FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS questions_select ON public.questions;
DROP POLICY IF EXISTS questions_write ON public.questions;
CREATE POLICY questions_select ON public.questions FOR SELECT TO authenticated USING (status = 'published' OR public.is_admin_user());
CREATE POLICY questions_write ON public.questions FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS choices_select ON public.question_choices;
DROP POLICY IF EXISTS choices_write ON public.question_choices;
CREATE POLICY choices_select ON public.question_choices FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.questions q WHERE q.id = question_id AND (q.status = 'published' OR public.is_admin_user())));
CREATE POLICY choices_write ON public.question_choices FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS blocks_select ON public.test_blocks;
DROP POLICY IF EXISTS blocks_insert ON public.test_blocks;
DROP POLICY IF EXISTS blocks_update ON public.test_blocks;
DROP POLICY IF EXISTS blocks_delete ON public.test_blocks;
CREATE POLICY blocks_select ON public.test_blocks FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin_user());
CREATE POLICY blocks_insert ON public.test_blocks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin_user());
CREATE POLICY blocks_update ON public.test_blocks FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin_user()) WITH CHECK (user_id = auth.uid() OR public.is_admin_user());
CREATE POLICY blocks_delete ON public.test_blocks FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS items_select ON public.test_block_items;
DROP POLICY IF EXISTS items_write ON public.test_block_items;
CREATE POLICY items_select ON public.test_block_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.test_blocks b WHERE b.id = block_id AND (b.user_id = auth.uid() OR public.is_admin_user())));
CREATE POLICY items_write ON public.test_block_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.test_blocks b WHERE b.id = block_id AND (b.user_id = auth.uid() OR public.is_admin_user()))) WITH CHECK (EXISTS (SELECT 1 FROM public.test_blocks b WHERE b.id = block_id AND (b.user_id = auth.uid() OR public.is_admin_user())));

DROP POLICY IF EXISTS responses_select ON public.test_responses;
DROP POLICY IF EXISTS responses_write ON public.test_responses;
CREATE POLICY responses_select ON public.test_responses FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.test_blocks b WHERE b.id = block_id AND (b.user_id = auth.uid() OR public.is_admin_user())));
CREATE POLICY responses_write ON public.test_responses FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.test_blocks b WHERE b.id = block_id AND (b.user_id = auth.uid() OR public.is_admin_user()))) WITH CHECK (EXISTS (SELECT 1 FROM public.test_blocks b WHERE b.id = block_id AND (b.user_id = auth.uid() OR public.is_admin_user())));
