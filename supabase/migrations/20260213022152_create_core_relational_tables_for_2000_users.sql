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

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  role public.app_user_role NOT NULL DEFAULT 'student',
  approved boolean NOT NULL DEFAULT false,
  academic_year smallint,
  academic_semester smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_email_lower_uniq UNIQUE (email),
  CONSTRAINT profiles_year_ck CHECK (academic_year IS NULL OR (academic_year BETWEEN 1 AND 5)),
  CONSTRAINT profiles_semester_ck CHECK (academic_semester IS NULL OR academic_semester IN (1,2))
);

CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code text,
  course_name text NOT NULL,
  academic_year smallint NOT NULL CHECK (academic_year BETWEEN 1 AND 5),
  academic_semester smallint NOT NULL CHECK (academic_semester IN (1,2)),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT courses_name_year_sem_uniq UNIQUE (course_name, academic_year, academic_semester)
);

CREATE TABLE IF NOT EXISTS public.course_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  topic_name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT course_topics_name_per_course_uniq UNIQUE (course_id, topic_name)
);

CREATE TABLE IF NOT EXISTS public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  topic_id uuid NOT NULL REFERENCES public.course_topics(id) ON DELETE RESTRICT,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  stem text NOT NULL,
  explanation text NOT NULL,
  objective text,
  difficulty smallint NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 3),
  status public.app_question_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.question_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  choice_label text NOT NULL CHECK (choice_label IN ('A','B','C','D','E')),
  choice_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  CONSTRAINT question_choice_label_uniq UNIQUE (question_id, choice_label)
);

CREATE TABLE IF NOT EXISTS public.test_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  mode public.app_block_mode NOT NULL,
  source public.app_block_source NOT NULL,
  status public.app_block_status NOT NULL DEFAULT 'in_progress',
  question_count integer NOT NULL CHECK (question_count > 0),
  duration_minutes integer,
  time_remaining_sec integer,
  current_index integer NOT NULL DEFAULT 0,
  elapsed_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.test_block_items (
  block_id uuid NOT NULL REFERENCES public.test_blocks(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position > 0),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
  PRIMARY KEY (block_id, position),
  CONSTRAINT test_block_item_unique_question UNIQUE (block_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.test_responses (
  block_id uuid NOT NULL,
  question_id uuid NOT NULL,
  selected_choice_labels text[] NOT NULL DEFAULT '{}'::text[],
  flagged boolean NOT NULL DEFAULT false,
  notes text,
  submitted boolean NOT NULL DEFAULT false,
  answered_at timestamptz,
  PRIMARY KEY (block_id, question_id),
  FOREIGN KEY (block_id, question_id)
    REFERENCES public.test_block_items(block_id, question_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profiles_role_approved ON public.profiles(role, approved);
CREATE INDEX IF NOT EXISTS idx_courses_year_sem ON public.courses(academic_year, academic_semester);
CREATE INDEX IF NOT EXISTS idx_course_topics_course_sort ON public.course_topics(course_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_questions_course_topic_status ON public.questions(course_id, topic_id, status);
CREATE INDEX IF NOT EXISTS idx_test_blocks_user_status_updated ON public.test_blocks(user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_block_items_question ON public.test_block_items(question_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_courses_updated_at ON public.courses;
CREATE TRIGGER trg_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_course_topics_updated_at ON public.course_topics;
CREATE TRIGGER trg_course_topics_updated_at
BEFORE UPDATE ON public.course_topics
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_questions_updated_at ON public.questions;
CREATE TRIGGER trg_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_test_blocks_updated_at ON public.test_blocks;
CREATE TRIGGER trg_test_blocks_updated_at
BEFORE UPDATE ON public.test_blocks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.approved = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_block_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_responses ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY responses_write ON public.test_responses FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.test_blocks b WHERE b.id = block_id AND (b.user_id = auth.uid() OR public.is_admin_user()))) WITH CHECK (EXISTS (SELECT 1 FROM public.test_blocks b WHERE b.id = block_id AND (b.user_id = auth.uid() OR public.is_admin_user())));;
