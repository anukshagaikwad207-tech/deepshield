"""
API route definitions.

POST /analyze
  Accepts a multipart file upload, validates it, dispatches to the appropriate
  analysis module, and returns a structured AnalysisResponse.

GET /health
  Lightweight liveness check used by the frontend to detect whether the
  backend is available before deciding to use real or demo analysis.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.analysis.audio import analyze_audio_bytes
from backend.analysis.image import analyze_image_bytes
from backend.analysis.video import analyze_video_bytes
from backend.schemas.models import AnalysisResponse
from backend.utils.validation import validate_upload

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
async def health() -> dict:
    """Liveness check.  Returns 200 when the backend is running."""
    return {"status": "ok", "model": "dima806/deepfake_vs_real_image_detection"}


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(file: UploadFile | str = File(...)) -> AnalysisResponse:
    """
    Analyse an uploaded image, video, or audio file for deepfake content.

    The file is validated for type and size before any model inference runs.
    Uploaded bytes are never persisted to disk outside of temporary files
    required for video frame extraction; those are deleted immediately after use.
    """
    if isinstance(file, str) or not getattr(file, "filename", None):
        raise HTTPException(status_code=400, detail="No file was attached to the request.")

    # Validate and detect media category
    category = await validate_upload(file)

    raw_bytes = await file.read()

    logger.info(
        "Analysing %s (%s, %.1f KB) as category=%s",
        file.filename,
        file.content_type,
        len(raw_bytes) / 1024,
        category,
    )

    try:
        if category == "image":
            return analyze_image_bytes(raw_bytes, file.filename)
        if category == "video":
            return analyze_video_bytes(raw_bytes, file.filename)
        if category == "audio":
            return analyze_audio_bytes(raw_bytes, file.filename)
    except ValueError as exc:
        # Raised by analysis modules for recoverable errors (e.g. corrupt file)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error during analysis of %s", file.filename)
        raise HTTPException(
            status_code=500,
            detail=(
                "An unexpected error occurred during analysis.  "
                "The file may be corrupted or in an unsupported variant of the format."
            ),
        ) from exc

    # Unreachable, but satisfies type checker
    raise HTTPException(status_code=500, detail="Internal routing error.")
