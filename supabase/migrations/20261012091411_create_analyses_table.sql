/*
# Create analyses table for DeepShield AI

## Purpose
Stores the history of media analysis sessions performed by users on the DeepShield AI platform.
No authentication is required; the data is shared/public within this single-tenant demo app.

## New Tables

### analyses
- `id` (uuid, primary key) — unique identifier for each analysis
- `created_at` (timestamptz) — when the analysis was submitted
- `file_name` (text) — original uploaded file name
- `file_type` (text) — category: 'image', 'video', or 'audio'
- `file_size` (bigint) — file size in bytes
- `status` (text) — 'processing' | 'complete' | 'error'
- `authenticity_score` (integer, 0-100) — demo confidence score
- `verdict` (text) — 'authentic' | 'suspicious' | 'likely_fake'
- `indicators` (jsonb) — array of suspicious indicator objects
- `explanation` (text) — human-readable summary of the result

## Security
- RLS enabled; anon + authenticated roles get full CRUD (single-tenant demo app, no sign-in).
*/

CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  file_name text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('image', 'video', 'audio')),
  file_size bigint NOT NULL,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'complete', 'error')),
  authenticity_score integer CHECK (authenticity_score BETWEEN 0 AND 100),
  verdict text CHECK (verdict IN ('authentic', 'suspicious', 'likely_fake')),
  indicators jsonb DEFAULT '[]'::jsonb,
  explanation text
);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_analyses" ON analyses;
CREATE POLICY "anon_select_analyses" ON analyses FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_analyses" ON analyses;
CREATE POLICY "anon_insert_analyses" ON analyses FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_analyses" ON analyses;
CREATE POLICY "anon_update_analyses" ON analyses FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_analyses" ON analyses;
CREATE POLICY "anon_delete_analyses" ON analyses FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS analyses_created_at_idx ON analyses (created_at DESC);
