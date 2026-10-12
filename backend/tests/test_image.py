"""
Unit tests for the image analysis module.

These tests call the actual model and require:
  1. The model weights downloaded (first run fetches from HuggingFace).
  2. The MODEL_TESTS=1 environment variable to be set.

Without MODEL_TESTS=1 every test is skipped, keeping CI fast.

Run with:
  MODEL_TESTS=1 pytest backend/tests/test_image.py -v
"""
from __future__ import annotations

import io
import os

import pytest
from PIL import Image

pytestmark = pytest.mark.skipif(
    os.environ.get("MODEL_TESTS") != "1",
    reason="Set MODEL_TESTS=1 to run tests that download model weights.",
)


@pytest.fixture(scope="module")
def load_image_model():
    from backend.analysis.image import load_model
    load_model()


def _solid_png(r: int, g: int, b: int, size: int = 64) -> bytes:
    """Create a solid-colour PNG as bytes."""
    img = Image.new("RGB", (size, size), (r, g, b))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class TestImageAnalyzer:
    def test_returns_analysis_response(self, load_image_model):
        from backend.analysis.image import analyze_image_bytes

        result = analyze_image_bytes(_solid_png(128, 64, 200), "test.png")
        assert result.file_type.value == "image"

    def test_authenticity_score_bounds(self, load_image_model):
        from backend.analysis.image import analyze_image_bytes

        result = analyze_image_bytes(_solid_png(200, 200, 200), "grey.png")
        assert 0 <= result.authenticity_score <= 100

    def test_raw_scores_sum_to_one(self, load_image_model):
        from backend.analysis.image import analyze_image_bytes

        result = analyze_image_bytes(_solid_png(255, 255, 255), "white.png")
        total = result.raw_scores.fake + result.raw_scores.real
        assert abs(total - 1.0) < 0.01

    def test_indicators_non_empty(self, load_image_model):
        from backend.analysis.image import analyze_image_bytes

        result = analyze_image_bytes(_solid_png(100, 150, 200), "colour.png")
        assert len(result.indicators) >= 1

    def test_explanation_non_empty(self, load_image_model):
        from backend.analysis.image import analyze_image_bytes

        result = analyze_image_bytes(_solid_png(0, 0, 0), "black.png")
        assert len(result.explanation) > 20

    def test_is_demo_false(self, load_image_model):
        from backend.analysis.image import analyze_image_bytes

        result = analyze_image_bytes(_solid_png(200, 100, 50), "test.png")
        assert result.is_demo is False

    def test_limitations_present(self, load_image_model):
        from backend.analysis.image import analyze_image_bytes

        result = analyze_image_bytes(_solid_png(128, 128, 128), "mid.png")
        assert len(result.limitations) > 0

    def test_verdict_consistent_with_score(self, load_image_model):
        """
        Verify that the verdict is consistent with the authenticity_score
        direction (higher score → more likely authentic verdict).
        This is not a guarantee about the model's accuracy on real-world images.
        """
        from backend.analysis.image import analyze_image_bytes
        from backend.config import settings

        result = analyze_image_bytes(_solid_png(128, 128, 128), "test.png")
        fake = result.raw_scores.fake

        if result.verdict.value == "likely_fake":
            assert fake >= settings.verdict_likely_fake_threshold
        elif result.verdict.value == "suspicious":
            assert settings.verdict_suspicious_threshold <= fake < settings.verdict_likely_fake_threshold
        else:
            assert fake < settings.verdict_suspicious_threshold
