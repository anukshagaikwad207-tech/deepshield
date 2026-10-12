"""
Shared pytest fixtures.

The image model is expensive to download and run.  Tests that exercise the
API end-to-end patch the analysis functions with lightweight stubs so the test
suite runs quickly without a GPU or network access.

Tests in test_image.py and test_video.py exercise the analysis logic directly
and are skipped unless the model has been downloaded (CI flag MODEL_TESTS=1).
"""
from __future__ import annotations

import io
import struct
import zlib
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.schemas.models import (
    AnalysisResponse,
    FileCategory,
    Indicator,
    RawScores,
    Severity,
    Verdict,
)


# ── Minimal synthetic media helpers ──────────────────────────────────────────

def make_png_bytes(width: int = 16, height: int = 16) -> bytes:
    """Create a tiny valid PNG image in memory (no PIL required)."""
    def chunk(name: bytes, data: bytes) -> bytes:
        c = name + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    # IHDR
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    # IDAT — one white scanline repeated
    raw_row = b"\x00" + b"\xff\xff\xff" * width
    compressed = zlib.compress(raw_row * height)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr_data)
        + chunk(b"IDAT", compressed)
        + chunk(b"IEND", b"")
    )
    return png


def make_stub_response(file_type: FileCategory = FileCategory.image) -> AnalysisResponse:
    return AnalysisResponse(
        file_name="test.png",
        file_type=file_type,
        verdict=Verdict.authentic,
        authenticity_score=82,
        raw_scores=RawScores(fake=0.18, real=0.82),
        indicators=[
            Indicator(
                label="Neural classifier: real signal",
                severity=Severity.low,
                description="Stub indicator for testing.",
            )
        ],
        explanation="Stub explanation for testing.",
        limitations=["Test limitation."],
        frame_results=None,
        is_demo=False,
    )


# ── App fixtures ─────────────────────────────────────────────────────────────

@pytest.fixture()
def client_with_stub_model():
    """
    TestClient with image model loading and analysis functions patched.
    No network access or GPU required.
    """
    stub = make_stub_response()

    with (
        patch("backend.analysis.image.load_model"),
        patch("backend.analysis.image.analyze_image_bytes", return_value=stub),
        patch("backend.analysis.video.analyze_video_bytes", return_value=stub),
    ):
        from backend.main import app
        with TestClient(app, raise_server_exceptions=True) as c:
            yield c
