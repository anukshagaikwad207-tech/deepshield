"""
File validation utilities.

Magic-byte detection is performed using the `filetype` library, which reads
the first few bytes of the file rather than trusting the client-supplied
Content-Type header.  This prevents extension-spoofing attacks where a
malicious file is renamed to a trusted extension.
"""
from __future__ import annotations

import filetype
from fastapi import HTTPException, UploadFile

from backend.config import settings

# Map category name → allowed MIME tuple
_ALLOWED_BY_CATEGORY: dict[str, tuple] = {
    "image": settings.allowed_image_types,
    "video": settings.allowed_video_types,
    "audio": settings.allowed_audio_types,
}

_ALL_ALLOWED: set[str] = {
    mime
    for mimes in _ALLOWED_BY_CATEGORY.values()
    for mime in mimes
}


async def validate_upload(file: UploadFile) -> str:
    """
    Validate an uploaded file and return its media category ('image',
    'video', or 'audio').

    Raises HTTPException(400) for:
      - files exceeding the configured size limit
      - MIME types not in the allowed set (checked via magic bytes)

    The function reads the file header bytes and then seeks back to the start
    so downstream consumers can re-read the full file contents.
    """
    # ── Size check ───────────────────────────────────────────────────────────
    # Read the whole file into memory to get the true size.
    # For production workloads with very large files a streaming approach
    # would be preferable; for this project 100 MB is within RAM budget.
    raw = await file.read()
    if len(raw) > settings.max_upload_bytes:
        limit_mb = settings.max_upload_bytes // (1024 * 1024)
        actual_mb = len(raw) / (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=(
                f"File too large: {actual_mb:.1f} MB received, "
                f"maximum allowed is {limit_mb} MB."
            ),
        )

    # ── Magic-byte MIME detection ─────────────────────────────────────────
    kind = filetype.guess(raw)
    if kind is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Could not determine file type from content.  "
                "Please upload a JPEG, PNG, WebP, GIF, BMP image; "
                "MP4, WebM, or MOV video; or MP3, WAV, FLAC, OGG audio."
            ),
        )

    detected_mime = kind.mime
    if detected_mime not in _ALL_ALLOWED:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported file type '{detected_mime}'.  "
                "Accepted: JPEG/PNG/WebP/GIF/BMP images, "
                "MP4/WebM/MOV videos, MP3/WAV/FLAC/OGG audio."
            ),
        )

    # ── Determine category ────────────────────────────────────────────────
    category = next(
        cat
        for cat, mimes in _ALLOWED_BY_CATEGORY.items()
        if detected_mime in mimes
    )

    # Seek back so callers can read the bytes again
    await file.seek(0)
    return category
