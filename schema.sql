-- O6U MedBank relational schema
-- Target: PostgreSQL 15+

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('student', 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_difficulty') THEN
    CREATE TYPE question_difficulty AS ENUM ('easy', 'medium', 'hard');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_status') THEN
    CREATE TYPE question_status AS ENUM ('draft', 'published', 'archived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'block_mode') THEN
    CREATE TYPE block_mode AS ENUM ('tutor', 'timed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'block_source') THEN
    CREATE TYPE block_source AS ENUM ('all', 'unused', 'incorrect', 'flagged');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'block_status') THEN
    CREATE TYPE block_status AS ENUM ('in_progress', 'completed', 'suspended');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  academic_year SMALLINT,
  academic_semester SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_academic_year_ck CHECK (academic_year IS NULL OR academic_year BETWEEN 1 AND 5),
  CONSTRAINT users_academic_semester_ck CHECK (academic_semester IS NULL OR academic_semester IN (1, 2)),
  CONSTRAINT users_role_year_sem_ck CHECK (
    (role = 'student' AND academic_year IS NOT NULL AND academic_semester IS NOT NULL)
    OR
    (role = 'admin' AND academic_year IS NULL AND academic_semester IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users ((LOWER(email)));

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code VARCHAR(20) NOT NULL,
  course_name VARCHAR(180) NOT NULL,
  academic_year SMALLINT NOT NULL CHECK (academic_year BETWEEN 1 AND 5),
  academic_semester SMALLINT NOT NULL CHECK (academic_semester IN (1, 2)),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT courses_code_year_sem_unique UNIQUE (course_code, academic_year, academic_semester),
  CONSTRAINT courses_name_year_sem_unique UNIQUE (course_name, academic_year, academic_semester)
);

CREATE TABLE IF NOT EXISTS course_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  topic_name VARCHAR(180) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS course_topics_course_name_unique_idx
  ON course_topics (course_id, LOWER(topic_name));

CREATE INDEX IF NOT EXISTS course_topics_course_order_idx ON course_topics (course_id, sort_order, topic_name);

CREATE TABLE IF NOT EXISTS user_course_enrollments (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS question_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_name VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS question_tags_name_unique_idx ON question_tags ((LOWER(tag_name)));

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  topic_id UUID NOT NULL REFERENCES course_topics(id) ON DELETE RESTRICT,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  stem TEXT NOT NULL,
  explanation TEXT NOT NULL,
  objective TEXT,
  references_text TEXT,
  question_image_url TEXT,
  explanation_image_url TEXT,
  source_text TEXT,
  difficulty question_difficulty NOT NULL DEFAULT 'medium',
  status question_status NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS questions_course_topic_status_idx ON questions (course_id, topic_id, status);
CREATE INDEX IF NOT EXISTS questions_author_idx ON questions (author_id);

CREATE TABLE IF NOT EXISTS question_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  choice_label CHAR(1) NOT NULL CHECK (choice_label IN ('A', 'B', 'C', 'D', 'E')),
  choice_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  display_order SMALLINT NOT NULL CHECK (display_order BETWEEN 1 AND 5),
  CONSTRAINT question_choices_question_label_unique UNIQUE (question_id, choice_label),
  CONSTRAINT question_choices_question_order_unique UNIQUE (question_id, display_order)
);

CREATE TABLE IF NOT EXISTS question_tag_map (
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES question_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, tag_id)
);

CREATE TABLE IF NOT EXISTS question_revisions (
  id BIGSERIAL PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT question_revisions_question_version_unique UNIQUE (question_id, version)
);

CREATE TABLE IF NOT EXISTS bulk_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES course_topics(id) ON DELETE SET NULL,
  source_file_name TEXT,
  raw_payload JSONB,
  total_rows INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bulk_import_job_errors (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES bulk_import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER,
  error_message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  selected_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  selected_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  mode block_mode NOT NULL,
  source block_source NOT NULL,
  status block_status NOT NULL DEFAULT 'in_progress',
  question_count INTEGER NOT NULL CHECK (question_count > 0),
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR (duration_minutes BETWEEN 5 AND 300)),
  time_remaining_sec INTEGER,
  randomize_questions BOOLEAN NOT NULL DEFAULT TRUE,
  current_index INTEGER NOT NULL DEFAULT 0 CHECK (current_index >= 0),
  elapsed_seconds INTEGER NOT NULL DEFAULT 0 CHECK (elapsed_seconds >= 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS test_blocks_user_status_idx ON test_blocks (user_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS test_block_items (
  block_id UUID NOT NULL REFERENCES test_blocks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 1),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  PRIMARY KEY (block_id, position),
  CONSTRAINT test_block_items_block_question_unique UNIQUE (block_id, question_id)
);

CREATE INDEX IF NOT EXISTS test_block_items_question_idx ON test_block_items (question_id);

CREATE TABLE IF NOT EXISTS test_responses (
  block_id UUID NOT NULL,
  question_id UUID NOT NULL,
  selected_choice_labels TEXT[] NOT NULL DEFAULT '{}'::text[],
  struck_choice_labels TEXT[] NOT NULL DEFAULT '{}'::text[],
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  time_spent_sec INTEGER NOT NULL DEFAULT 0 CHECK (time_spent_sec >= 0),
  submitted BOOLEAN NOT NULL DEFAULT FALSE,
  answered_at TIMESTAMPTZ,
  PRIMARY KEY (block_id, question_id),
  FOREIGN KEY (block_id, question_id)
    REFERENCES test_block_items(block_id, question_id)
    ON DELETE CASCADE,
  CONSTRAINT selected_choice_labels_valid_ck CHECK (selected_choice_labels <@ ARRAY['A', 'B', 'C', 'D', 'E']),
  CONSTRAINT struck_choice_labels_valid_ck CHECK (struck_choice_labels <@ ARRAY['A', 'B', 'C', 'D', 'E'])
);

CREATE TABLE IF NOT EXISTS incorrect_queue (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, question_id)
);

CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  front_text TEXT NOT NULL,
  back_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  block_id UUID REFERENCES test_blocks(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS question_feedback_status_idx ON question_feedback (status, created_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_name VARCHAR(120) NOT NULL,
  sender_email VARCHAR(254) NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(80) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS invites_code_unique_idx ON invites ((LOWER(code)));

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_courses_updated_at ON courses;
CREATE TRIGGER trg_courses_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_course_topics_updated_at ON course_topics;
CREATE TRIGGER trg_course_topics_updated_at
BEFORE UPDATE ON course_topics
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_questions_updated_at ON questions;
CREATE TRIGGER trg_questions_updated_at
BEFORE UPDATE ON questions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_test_blocks_updated_at ON test_blocks;
CREATE TRIGGER trg_test_blocks_updated_at
BEFORE UPDATE ON test_blocks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_flashcards_updated_at ON flashcards;
CREATE TRIGGER trg_flashcards_updated_at
BEFORE UPDATE ON flashcards
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION enforce_question_choice_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_question_id UUID;
  v_total_choices INTEGER;
  v_correct_choices INTEGER;
BEGIN
  v_question_id := COALESCE(NEW.question_id, OLD.question_id);

  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_correct)
  INTO v_total_choices, v_correct_choices
  FROM question_choices
  WHERE question_id = v_question_id;

  IF v_total_choices < 2 OR v_total_choices > 5 THEN
    RAISE EXCEPTION 'Question % must have between 2 and 5 choices (current: %)', v_question_id, v_total_choices;
  END IF;

  IF v_correct_choices < 1 THEN
    RAISE EXCEPTION 'Question % must have at least 1 correct choice', v_question_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_question_choice_rules ON question_choices;
CREATE CONSTRAINT TRIGGER trg_question_choice_rules
AFTER INSERT OR UPDATE OR DELETE ON question_choices
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION enforce_question_choice_rules();

CREATE OR REPLACE VIEW vw_student_course_access AS
SELECT
  u.id AS user_id,
  u.full_name,
  u.academic_year,
  u.academic_semester,
  c.id AS course_id,
  c.course_code,
  c.course_name
FROM users u
JOIN user_course_enrollments e ON e.user_id = u.id
JOIN courses c ON c.id = e.course_id
WHERE u.role = 'student'
  AND c.is_active = TRUE;

CREATE OR REPLACE VIEW vw_student_available_questions AS
SELECT
  e.user_id,
  q.id AS question_id,
  c.course_code,
  c.course_name,
  t.topic_name,
  q.status,
  q.difficulty,
  q.created_at
FROM user_course_enrollments e
JOIN courses c ON c.id = e.course_id
JOIN questions q ON q.course_id = c.id
JOIN course_topics t ON t.id = q.topic_id
WHERE q.status = 'published'
  AND c.is_active = TRUE
  AND t.is_active = TRUE;

COMMIT;
