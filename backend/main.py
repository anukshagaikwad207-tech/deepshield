"""
DeepShield AI — FastAPI backend entry point.

Run locally:
  uvicorn backend.main:app --reload --port 8000

The image model is downloaded and loaded once during application startup via
the lifespan context manager.  Subsequent requests pay no model-loading cost.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.analysis.image import load_model
from backend.api.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models on startup so requests are not delayed by cold loading."""
    logger.info("Starting DeepShield AI backend — loading models…")
    load_model()
    logger.info("Backend ready.")
    yield
    logger.info("Backend shutting down.")


app = FastAPI(
    title="DeepShield AI",
    description=(
        "AI-assisted deepfake detection API.  "
        "Analyses images, videos, and audio files using pretrained models.  "
        "Results are analytical signals, not definitive ground truth."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the Vite dev server and any other local frontend origin.
# In production, replace allow_origins with a specific list of trusted origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
