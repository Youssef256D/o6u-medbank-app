-- O6U MedBank Supabase full setup
-- Includes: schema.sql + seed.sql + supabase_appstate_compat.sql

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

-- O6U MedBank seed data
-- Safe to run multiple times.

BEGIN;

-- Demo users
INSERT INTO users (full_name, email, password_hash, role, is_verified, academic_year, academic_semester)
SELECT 'O6U Admin', 'admin@o6umed.local', crypt('admin123', gen_salt('bf')), 'admin', TRUE, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE LOWER(email) = LOWER('admin@o6umed.local')
);

INSERT INTO users (full_name, email, password_hash, role, is_verified, academic_year, academic_semester)
SELECT 'O6U Demo Student', 'student@o6umed.local', crypt('student123', gen_salt('bf')), 'student', TRUE, 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE LOWER(email) = LOWER('student@o6umed.local')
);

-- Keep demo users aligned
UPDATE users
SET
  full_name = 'O6U Admin',
  role = 'admin',
  is_verified = TRUE,
  academic_year = NULL,
  academic_semester = NULL
WHERE LOWER(email) = LOWER('admin@o6umed.local');

UPDATE users
SET
  full_name = 'O6U Demo Student',
  role = 'student',
  is_verified = TRUE,
  academic_year = 1,
  academic_semester = 1
WHERE LOWER(email) = LOWER('student@o6umed.local');

-- Curriculum courses (Skills/Elective removed)
WITH course_seed(course_code, course_name, academic_year, academic_semester) AS (
  VALUES
    ('Intro 100', 'Introduction for All Students (Intro 100)', 1, 1),
    ('BOS 101', 'Introduction to Body Structure (BOS 101)', 1, 1),
    ('GMD 102', 'Gross & Microscopic Aspects of Diseases (GMD 102)', 1, 1),
    ('MIP 103', 'Introduction to Microbial and Parasitic Agents (MIP 103)', 1, 1),
    ('DRG 104', 'Introduction to Drug Therapy (DRG 104)', 1, 1),
    ('MET 105', 'Medical Terminology (MET 105)', 1, 1),

    ('MBI 106', 'Molecular Biology (MBI 106)', 1, 2),
    ('MUS 107', 'Musculoskeletal (MUS 107)', 1, 2),
    ('HID 108', 'Hemopoetic System, Immunity & Defense Mechanism (HID 108)', 1, 2),
    ('CTX 109', 'Clinical Toxicology (CTX 109)', 1, 2),
    ('CSC 110', 'Computer Science (CSC 110)', 1, 2),

    ('RES 201', 'Respiratory System (RES 201)', 2, 1),
    ('CVS 202', 'Cardiovascular System (CVS 202)', 2, 1),
    ('GIL 203', 'GIT & Liver (GIL 203)', 2, 1),
    ('SOB 204', 'Social & Behavioral Science (SOB 204)', 2, 1),

    ('MEN 205', 'Metabolism & Nutrition (MEN 205)', 2, 2),
    ('NER 206', 'Nervous System (NER 206)', 2, 2),
    ('URS 207', 'Urinary System (URS 207)', 2, 2),
    ('ERP 208', 'Endocrinology & Reproduction (ERP 208)', 2, 2),
    ('HRT 209', 'Human Rights (HRT 209)', 2, 2),

    ('OPH 301', 'Ophthalmology (OPH 301)', 3, 1),
    ('MLG 302', 'Medico-legal Aspects (MLG 302)', 3, 1),
    ('MRS 303', 'Medical Research Methodology (MRS 303)', 3, 1),
    ('MST 304', 'Medical Statistics (MST 304)', 3, 1),
    ('MED 305', 'Introduction to General Medicine (MED 305)', 3, 1),

    ('ENT 306', 'ENT (ENT 306)', 3, 2),
    ('NHC 307', 'National Health Care System (NHC 307)', 3, 2),
    ('EMD 308', 'Embryological Development (EMD 308)', 3, 2),
    ('PTS 309', 'Patient Safety (PTS 309)', 3, 2),
    ('SUR 310', 'Introduction to General Surgery (SUR 310)', 3, 2),

    ('Ped 401', 'Pediatric 401 (Ped 401)', 4, 1),
    ('SM 402', 'Surgery Medical 402 (SM 402)', 4, 1),
    ('SM 403', 'Surgery Medical 403 (SM 403)', 4, 1),
    ('SM 404', 'Surgery Medical 404 (SM 404)', 4, 1),

    ('Ped 405', 'Pediatric 405 (Ped 405)', 4, 2),
    ('SM 406', 'Surgery Medical 406 (SM 406)', 4, 2),
    ('SM 407', 'Surgery Medical 407 (SM 407)', 4, 2),

    ('Obs 501', 'Obstetric (Obs 501)', 5, 1),
    ('SM 502', 'Surgery Medical 502 (SM 502)', 5, 1),
    ('SM 503', 'Surgery Medical 503 (SM 503)', 5, 1),

    ('Gyn 504', 'Gynecology (Gyn 504)', 5, 2),
    ('SM 505', 'Surgery Medical 505 (SM 505)', 5, 2),
    ('SM 506', 'Surgery Medical 506 (SM 506)', 5, 2),
    ('SM 507', 'Surgery Medical 507 (SM 507)', 5, 2)
)
INSERT INTO courses (course_code, course_name, academic_year, academic_semester, is_active)
SELECT course_code, course_name, academic_year, academic_semester, TRUE
FROM course_seed
ON CONFLICT (course_code, academic_year, academic_semester)
DO UPDATE
SET
  course_name = EXCLUDED.course_name,
  is_active = TRUE;

-- Remove deprecated default topics from all courses
DELETE FROM course_topics
WHERE LOWER(topic_name) IN (LOWER('Module Overview'), LOWER('Model Overview'));

INSERT INTO course_topics (course_id, topic_name, sort_order)
SELECT c.id, 'All topics', 999
FROM courses c
WHERE NOT EXISTS (
  SELECT 1
  FROM course_topics t
  WHERE t.course_id = c.id
    AND LOWER(t.topic_name) = LOWER('All topics')
);

-- Specific topic sets requested by product flow
WITH topic_seed(course_code, academic_year, academic_semester, topic_name, sort_order) AS (
  VALUES
    ('ERP 208', 2, 2, 'Introduction and Pituitary Gland', 10),
    ('ERP 208', 2, 2, 'Thyroid Gland', 20),
    ('ERP 208', 2, 2, 'Calcium Metabolism and Metabolic Bone Diseases', 30),
    ('ERP 208', 2, 2, 'Suprarenal Gland', 40),
    ('ERP 208', 2, 2, 'Endocrine Diseases of the Pancreas', 50),
    ('ERP 208', 2, 2, 'Breast Surgery', 60),

    ('Ped 401', 4, 1, 'Chapter 1: Neonatology', 10),
    ('Ped 401', 4, 1, 'Chapter 2: Nephrology', 20),
    ('Ped 401', 4, 1, 'Chapter 3: Hematology', 30),
    ('Ped 401', 4, 1, 'Chapter 4: Endocrinology', 40),
    ('Ped 401', 4, 1, 'Chapter 5: Neurology', 50),
    ('Ped 401', 4, 1, 'Chapter 6: Emergencies', 60),

    ('NER 206', 2, 2, 'Neuroanatomy', 10),
    ('NER 206', 2, 2, 'Stroke', 20),
    ('NER 206', 2, 2, 'Seizure Disorders', 30),
    ('NER 206', 2, 2, 'Neuromuscular Disorders', 40)
)
INSERT INTO course_topics (course_id, topic_name, sort_order)
SELECT c.id, ts.topic_name, ts.sort_order
FROM topic_seed ts
JOIN courses c
  ON c.course_code = ts.course_code
 AND c.academic_year = ts.academic_year
 AND c.academic_semester = ts.academic_semester
WHERE NOT EXISTS (
  SELECT 1
  FROM course_topics t
  WHERE t.course_id = c.id
    AND LOWER(t.topic_name) = LOWER(ts.topic_name)
);

-- Enroll admin in all active courses
WITH admin_user AS (
  SELECT id FROM users WHERE LOWER(email) = LOWER('admin@o6umed.local') LIMIT 1
)
INSERT INTO user_course_enrollments (user_id, course_id, assigned_by)
SELECT a.id, c.id, a.id
FROM admin_user a
JOIN courses c ON c.is_active = TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM user_course_enrollments e WHERE e.user_id = a.id AND e.course_id = c.id
);

-- Enroll demo student in Year 1 Semester 1 courses
WITH student_user AS (
  SELECT id FROM users WHERE LOWER(email) = LOWER('student@o6umed.local') LIMIT 1
),
sem_courses AS (
  SELECT id FROM courses WHERE academic_year = 1 AND academic_semester = 1 AND is_active = TRUE
),
admin_user AS (
  SELECT id FROM users WHERE LOWER(email) = LOWER('admin@o6umed.local') LIMIT 1
)
INSERT INTO user_course_enrollments (user_id, course_id, assigned_by)
SELECT s.id, c.id, a.id
FROM student_user s
JOIN sem_courses c ON TRUE
JOIN admin_user a ON TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM user_course_enrollments e WHERE e.user_id = s.id AND e.course_id = c.id
);

-- Invite codes
WITH admin_user AS (
  SELECT id FROM users WHERE LOWER(email) = LOWER('admin@o6umed.local') LIMIT 1
),
invite_seed(code) AS (
  VALUES ('O6U-FACMED-2026'), ('O6U-DEMO-BETA')
)
INSERT INTO invites (code, is_active, created_by)
SELECT i.code, TRUE, a.id
FROM invite_seed i
JOIN admin_user a ON TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM invites inv WHERE LOWER(inv.code) = LOWER(i.code)
);

-- Common tags
WITH tag_seed(tag_name) AS (
  VALUES ('endocrine'), ('pediatrics'), ('neurology'), ('clinical')
)
INSERT INTO question_tags (tag_name)
SELECT t.tag_name
FROM tag_seed t
WHERE NOT EXISTS (
  SELECT 1 FROM question_tags qt WHERE LOWER(qt.tag_name) = LOWER(t.tag_name)
);

-- One sample published question + choices
WITH author_admin AS (
  SELECT id FROM users WHERE LOWER(email) = LOWER('admin@o6umed.local') LIMIT 1
),
seed_course AS (
  SELECT id AS course_id
  FROM courses
  WHERE course_code = 'ERP 208' AND academic_year = 2 AND academic_semester = 2
  LIMIT 1
),
seed_topic AS (
  SELECT t.id AS topic_id
  FROM course_topics t
  JOIN seed_course c ON c.course_id = t.course_id
  WHERE LOWER(t.topic_name) = LOWER('Endocrine Diseases of the Pancreas')
  LIMIT 1
),
insert_question AS (
  INSERT INTO questions (
    course_id,
    topic_id,
    author_id,
    stem,
    explanation,
    objective,
    references_text,
    difficulty,
    status,
    source_text,
    published_at
  )
  SELECT
    c.course_id,
    t.topic_id,
    a.id,
    'A patient with polyuria, polydipsia, abdominal pain, and ketotic breath presents with hyperglycemia. What is the first management priority?',
    'Immediate isotonic fluid resuscitation is the first step in DKA management before insulin and potassium-guided therapy.',
    'Prioritize initial management steps in diabetic ketoacidosis.',
    'ADA Clinical Practice Recommendations',
    'medium',
    'published',
    'O6U Internal QBank',
    NOW()
  FROM seed_course c
  JOIN seed_topic t ON TRUE
  JOIN author_admin a ON TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM questions q
    WHERE q.stem = 'A patient with polyuria, polydipsia, abdominal pain, and ketotic breath presents with hyperglycemia. What is the first management priority?'
  )
  RETURNING id
)
INSERT INTO question_choices (question_id, choice_label, choice_text, is_correct, display_order)
SELECT q.id, x.choice_label, x.choice_text, x.is_correct, x.display_order
FROM insert_question q
JOIN (
  VALUES
    ('A', 'Immediate isotonic fluid resuscitation', TRUE, 1),
    ('B', 'Start oral hypoglycemic agents', FALSE, 2),
    ('C', 'Give bicarbonate to all patients', FALSE, 3),
    ('D', 'Delay fluids until insulin starts', FALSE, 4),
    ('E', 'Restrict potassium in all cases', FALSE, 5)
) AS x(choice_label, choice_text, is_correct, display_order)
ON TRUE;

COMMIT;

-- Supabase compatibility migration for app-state sync table naming.
-- Handles both legacy: public.appstate(storagekey) and canonical: public.app_state(storage_key).
-- Safe to run multiple times.

BEGIN;

-- If only legacy table exists, rename it to canonical table name.
DO $$
BEGIN
  IF to_regclass('public.appstate') IS NOT NULL
     AND to_regclass('public.app_state') IS NULL THEN
    ALTER TABLE public.appstate RENAME TO app_state;
  END IF;
END $$;

-- Ensure canonical table exists.
CREATE TABLE IF NOT EXISTS public.app_state (
  storage_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If a legacy column name still exists, rename it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'app_state'
      AND column_name = 'storagekey'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'app_state'
      AND column_name = 'storage_key'
  ) THEN
    ALTER TABLE public.app_state RENAME COLUMN storagekey TO storage_key;
  END IF;
END $$;

-- If both tables exist, merge legacy rows into canonical and keep canonical as source of truth.
DO $$
BEGIN
  IF to_regclass('public.appstate') IS NOT NULL
     AND to_regclass('public.app_state') IS NOT NULL
     AND to_regclass('public.appstate') <> to_regclass('public.app_state') THEN
    INSERT INTO public.app_state (storage_key, payload, updated_at)
    SELECT a.storagekey, a.payload, COALESCE(a.updated_at, NOW())
    FROM public.appstate a
    ON CONFLICT (storage_key) DO UPDATE
    SET
      payload = EXCLUDED.payload,
      updated_at = EXCLUDED.updated_at;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS app_state_updated_at_idx ON public.app_state (updated_at DESC);

ALTER TABLE public.app_state DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_state TO anon, authenticated;

COMMIT;
