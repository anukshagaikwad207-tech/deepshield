"""
Unit tests for the video analysis module.

Like test_image.py, these require MODEL_TESTS=1 and a real model download.
They also require opencv-python-headless and numpy.

Run with:
  MODEL_TESTS=1 pytest backend/tests/test_video.py -v
"""
from __future__ import annotations

import io
import os
import struct
import tempfile

import pytest

pytestmark = pytest.mark.skipif(
    os.environ.get("MODEL_TESTS") != "1",
    reason="Set MODEL_TESTS=1 to run tests that download model weights.",
)


@pytest.fixture(scope="module")
def load_image_model():
    from backend.analysis.image import load_model
    load_model()


def _make_tiny_mp4() -> bytes:
    """
    Create the smallest valid MP4-like file that OpenCV can decode.

    We use OpenCV's VideoWriter to write a 4-frame 16×16 grey video to a
    temporary file and return the bytes.  This avoids a numpy/ffmpeg
    dependency and produces a real decodable video.
    """
    import cv2
    import numpy as np

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        path = tmp.name

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(path, fourcc, 1.0, (16, 16))
    for _ in range(4):
        frame = np.full((16, 16, 3), 128, dtype=np.uint8)
        writer.write(frame)
    writer.release()

    with open(path, "rb") as f:
        data = f.read()
    os.unlink(path)
    return data


class TestVideoAnalyzer:
    def test_returns_analysis_response(self, load_image_model):
        from backend.analysis.video import analyze_video_bytes

        mp4 = _make_tiny_mp4()
        result = analyze_video_bytes(mp4, "clip.mp4")
        assert result.file_type.value == "video"

    def test_frame_results_populated(self, load_image_model):
        from backend.analysis.video import analyze_video_bytes

        mp4 = _make_tiny_mp4()
        result = analyze_video_bytes(mp4, "clip.mp4")
        assert result.frame_results is not None
        assert len(result.frame_results) >= 1

    def test_frame_scores_in_range(self, load_image_model):
        from backend.analysis.video import analyze_video_bytes

        mp4 = _make_tiny_mp4()
        result = analyze_video_bytes(mp4, "clip.mp4")
        for fr in result.frame_results:
            assert 0.0 <= fr.fake_score <= 1.0
            assert 0.0 <= fr.real_score <= 1.0

    def test_authenticity_score_in_range(self, load_image_model):
        from backend.analysis.video import analyze_video_bytes

        mp4 = _make_tiny_mp4()
        result = analyze_video_bytes(mp4, "clip.mp4")
        assert 0 <= result.authenticity_score <= 100

    def test_is_demo_false(self, load_image_model):
        from backend.analysis.video import analyze_video_bytes

        mp4 = _make_tiny_mp4()
        result = analyze_video_bytes(mp4, "clip.mp4")
        assert result.is_demo is False

    def test_limitations_include_frame_count_note(self, load_image_model):
        from backend.analysis.video import analyze_video_bytes

        mp4 = _make_tiny_mp4()
        result = analyze_video_bytes(mp4, "clip.mp4")
        assert any("frame" in lim.lower() for lim in result.limitations)
