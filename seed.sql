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
