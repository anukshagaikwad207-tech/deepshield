/*
# Add real-backend result columns to analyses table

## Purpose
Extends the analyses table to store richer data returned by the real FastAPI
deepfake-detection backend, while preserving backwards compatibility with rows
created in demo mode.

## Modified Table: analyses

### New columns
- `is_demo` (boolean, default true) — true when results come from the simulation,
  false when they come from a real model inference. Existing rows default to true.
- `raw_scores` (jsonb) — raw per-class softmax scores from the model, e.g.
  {"real": 0.87, "fake": 0.13}. Null for demo rows.
- `frame_results` (jsonb) — for video files, an array of per-frame scores so the
  caller can inspect frame-level evidence. Null for image/audio rows.
- `limitations` (jsonb array of text) — known model limitations returned by the
  backend alongside every result so the UI can display them honestly.

## Notes
- All new columns are nullable or have safe defaults so existing demo rows remain valid.
- No columns are dropped or renamed.
*/

ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS raw_scores jsonb,
  ADD COLUMN IF NOT EXISTS frame_results jsonb,
  ADD COLUMN IF NOT EXISTS limitations jsonb DEFAULT '[]'::jsonb;
