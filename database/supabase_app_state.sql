-- Supabase app-state sync table for the current frontend prototype.
-- This stores the same JSON blobs currently kept in localStorage.
-- Run this in Supabase SQL Editor.

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_state (
  storage_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_state_updated_at_idx ON public.app_state (updated_at DESC);

ALTER TABLE public.app_state DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_state TO anon, authenticated;

COMMIT;
