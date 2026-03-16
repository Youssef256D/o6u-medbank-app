BEGIN;

-- Add question_type column to questions table
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'mcq'
    CHECK (question_type IN ('mcq', 'written'));

-- Add model_answer column to questions table
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS model_answer TEXT;

-- Add written_answer column to test_responses table
ALTER TABLE test_responses
  ADD COLUMN IF NOT EXISTS written_answer TEXT;

-- Relax the choice-count trigger so it only enforces rules for MCQ questions.
-- Written questions legitimately have zero choices.
CREATE OR REPLACE FUNCTION enforce_question_choice_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_question_id UUID;
  v_question_type TEXT;
  v_total_choices INTEGER;
  v_correct_choices INTEGER;
BEGIN
  v_question_id := COALESCE(NEW.question_id, OLD.question_id);

  SELECT question_type INTO v_question_type
  FROM questions
  WHERE id = v_question_id;

  -- Written questions have no choices — skip all choice-count rules
  IF v_question_type = 'written' THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_correct)
  INTO v_total_choices, v_correct_choices
  FROM question_choices
  WHERE question_id = v_question_id;

  IF v_total_choices < 2 OR v_total_choices > 5 THEN
    RAISE EXCEPTION 'MCQ question % must have between 2 and 5 choices (current: %)',
      v_question_id, v_total_choices;
  END IF;

  IF v_correct_choices < 1 THEN
    RAISE EXCEPTION 'MCQ question % must have at least 1 correct choice', v_question_id;
  END IF;

  RETURN NULL;
END;
$$;

-- Index for efficient filtering by question type
CREATE INDEX IF NOT EXISTS questions_type_idx ON questions (question_type);

COMMIT;
