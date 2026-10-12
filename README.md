# DeepShield AI — Building Trust in the Digital World

A modern, full-stack deepfake detection platform built as a college capstone project.

The frontend is a React/TypeScript SPA backed by Supabase for analysis history.
The backend is a Python/FastAPI service that runs a real pretrained Vision
Transformer model for image and video deepfake detection.

---

## Architecture overview

```
┌─────────────────────────┐      HTTP multipart      ┌──────────────────────────┐
│   React / Vite frontend │  ─────────────────────►  │  FastAPI backend          │
│   (port 5173)           │  ◄─────────────────────  │  (port 8000)              │
└────────────┬────────────┘      JSON result          └──────────┬───────────────┘
             │                                                   │
             │  Supabase JS                          transformers pipeline
             ▼                                       (ViT model weights,
     ┌───────────────┐                                downloaded on first run)
     │  Supabase DB  │
     │  (analyses)   │
     └───────────────┘
```

If the backend is not running, the frontend falls back to demo simulation mode
automatically — clearly labelled in the UI.

---

## Detection model

| Property        | Detail |
|-----------------|--------|
| Model ID        | `dima806/deepfake_vs_real_image_detection` |
| Architecture    | Vision Transformer (ViT), fine-tuned on face images |
| Base model      | `google/vit-base-patch16-224` |
| Input           | PIL Image, auto-resized to 224 × 224 |
| Output          | `"Real"` / `"Fake"` with softmax scores |
| Reported F1     | ~99.3% on held-out test set (pre-2024 GAN face images) |
| License         | Unspecified on model card; public HuggingFace repo — educational/research use |
| Reference       | https://huggingface.co/dima806/deepfake_vs_real_image_detection |

**Important limitations (also surfaced in the UI):**

1. The model was trained ~3 years ago on GAN-generated face images. Modern
   diffusion-model images (Stable Diffusion, DALL-E 3, Midjourney) may not be
   detected reliably.
2. Softmax scores are **not** calibrated probabilities. A score of 0.90 does
   not mean "90% chance of being fake".
3. The model produces a single image-level prediction and cannot localise the
   manipulated region.
4. Audio deepfake detection is **not yet implemented** — a placeholder response
   is returned for audio files.

---

## Supported file types

| Category | Formats                         | Max size |
|----------|---------------------------------|----------|
| Image    | JPEG, PNG, WebP, GIF, BMP       | 100 MB   |
| Video    | MP4, WebM, MOV, AVI             | 100 MB   |
| Audio    | MP3, WAV, FLAC, OGG, AAC        | 100 MB   |

Video files are analysed by extracting up to 8 evenly spaced frames and
running the image model on each.

---

## Prerequisites

- **Node.js** 18+ and npm 8+ (frontend)
- **Python** 3.10+ (backend)
- A [Supabase](https://supabase.com) project (free tier works)

---

## Frontend setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env` in the project root (already present if you cloned this repo):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Uncomment to enable real backend analysis:
# VITE_API_URL=http://localhost:8000
```

### 3. Apply the database schema

Run in your Supabase SQL editor:

```sql
CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  file_name text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('image', 'video', 'audio')),
  file_size bigint NOT NULL,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'complete', 'error')),
  authenticity_score integer CHECK (authenticity_score BETWEEN 0 AND 100),
  verdict text CHECK (verdict IN ('authentic', 'suspicious', 'likely_fake')),
  indicators jsonb DEFAULT '[]'::jsonb,
  explanation text,
  is_demo boolean NOT NULL DEFAULT true,
  raw_scores jsonb,
  frame_results jsonb,
  limitations jsonb DEFAULT '[]'::jsonb
);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select" ON analyses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert" ON analyses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update" ON analyses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete" ON analyses FOR DELETE TO anon, authenticated USING (true);
```

### 4. Start the frontend

```bash
npm run dev
```

Open http://localhost:5173 — the app runs in demo mode until the backend is configured.

---

## Backend setup

### 1. Create a virtual environment

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

> **Note on PyTorch:** `torch` can be 2–3 GB. For a CPU-only install (faster
> download, no GPU required):
> ```bash
> pip install torch --index-url https://download.pytorch.org/whl/cpu
> pip install -r requirements.txt
> ```

### 3. Start the backend

```bash
# From the project root (important — backend/ is a package)
uvicorn backend.main:app --reload --port 8000
```

On first startup the ViT model weights are downloaded from HuggingFace
(~330 MB). Subsequent starts load from the local cache.

### 4. Enable the backend in the frontend

Uncomment `VITE_API_URL` in `.env`:

```env
VITE_API_URL=http://localhost:8000
```

Then restart `npm run dev`.  The Upload page will show "Real AI backend
configured" and analysis results will display the green "REAL AI ANALYSIS"
banner.

---

## Running tests

### Backend tests (no model download required)

```bash
# From the project root
pip install pytest httpx
pytest backend/tests/test_api.py -v
```

### Backend tests with real model inference

These download the model weights and run actual inference — set `MODEL_TESTS=1`:

```bash
MODEL_TESTS=1 pytest backend/tests/ -v
```

### Frontend type checking

```bash
npm run typecheck
```

---

## Project structure

```
.
├── backend/
│   ├── main.py                   # FastAPI app, lifespan, CORS
│   ├── config.py                 # Size limits, model IDs, thresholds, limitations
│   ├── requirements.txt
│   ├── api/
│   │   └── routes.py             # POST /analyze, GET /health
│   ├── analysis/
│   │   ├── image.py              # ViT deepfake classifier
│   │   ├── video.py              # Frame extraction + image model
│   │   └── audio.py              # Placeholder (not yet implemented)
│   ├── schemas/
│   │   └── models.py             # Pydantic request/response models
│   ├── utils/
│   │   └── validation.py         # Magic-byte MIME validation, size limits
│   └── tests/
│       ├── conftest.py           # Shared fixtures, synthetic test media
│       ├── test_api.py           # Integration tests (no model download)
│       ├── test_image.py         # Unit tests (MODEL_TESTS=1)
│       └── test_video.py         # Unit tests (MODEL_TESTS=1)
│
└── src/
    ├── lib/
    │   ├── api.ts                # Frontend → backend bridge
    │   ├── demo.ts               # Demo simulation fallback
    │   └── supabase.ts           # Supabase client
    ├── pages/
    │   ├── Dashboard.tsx
    │   ├── Upload.tsx            # Tries backend, falls back to demo
    │   ├── Analysis.tsx          # Demo progress animation
    │   ├── Results.tsx           # Real vs demo result display, frame timeline
    │   └── About.tsx
    └── types/index.ts
```

---

## API reference

### `GET /health`

Liveness check.

```json
{ "status": "ok", "model": "dima806/deepfake_vs_real_image_detection" }
```

### `POST /analyze`

Accepts: `multipart/form-data` with a `file` field.

Returns `AnalysisResponse`:

```jsonc
{
  "file_name": "photo.jpg",
  "file_type": "image",           // "image" | "video" | "audio"
  "verdict": "likely_fake",       // "authentic" | "suspicious" | "likely_fake"
  "authenticity_score": 23,       // 0–100 (higher = more authentic)
  "raw_scores": {
    "fake": 0.7689,               // Raw softmax score — NOT a calibrated probability
    "real": 0.2311
  },
  "indicators": [
    {
      "label": "Neural classifier: fake signal detected",
      "severity": "high",         // "low" | "medium" | "high"
      "description": "..."
    }
  ],
  "explanation": "...",
  "limitations": ["..."],
  "frame_results": null,          // Array of per-frame scores for video files
  "is_demo": false
}
```

**Error responses:**

| Status | Cause |
|--------|-------|
| 400    | No file attached, or file exceeds 100 MB |
| 415    | Unsupported file type (checked via magic bytes) |
| 422    | File is corrupt or unreadable |
| 500    | Unexpected model or server error |

---

## Integrating audio deepfake detection (future work)

Edit `backend/analysis/audio.py`.  The function signature is:

```python
def analyze_audio_bytes(audio_bytes: bytes, file_name: str) -> AnalysisResponse:
    ...
```

Candidate models:
- **wav2vec2-based classifiers** — fine-tuned on ASVspoof; available on HuggingFace
- **AASIST** — https://github.com/clovaai/aasist (ASVspoof 2021 winner)
- **RawNet2** — raw-waveform anti-spoofing model

Remove the `is_demo=True` flag from the return value once a real model is
integrated and validated.

---

## Privacy & ethics

- Uploaded file content is **never persisted** outside of the temporary files
  needed for video frame extraction (deleted immediately after use).
- Detection is probabilistic — false positives and false negatives both occur.
- Results must not be used to accuse, defame, or harass individuals.
- This project is for educational and research purposes only.

---

## License

MIT — free for educational and non-commercial use.
