"""
Integration tests for the FastAPI endpoints.

All tests use the stub-model fixture from conftest.py so they run without
downloading the actual model weights or requiring GPU access.
"""
from __future__ import annotations

import io

import pytest

from backend.tests.conftest import make_png_bytes


class TestHealth:
    def test_health_returns_200(self, client_with_stub_model):
        resp = client_with_stub_model.get("/health")
        assert resp.status_code == 200

    def test_health_body(self, client_with_stub_model):
        body = client_with_stub_model.get("/health").json()
        assert body["status"] == "ok"
        assert "model" in body


class TestAnalyzeValidation:
    def test_no_file_returns_422(self, client_with_stub_model):
        resp = client_with_stub_model.post("/analyze")
        assert resp.status_code == 422

    def test_unsupported_type_returns_415(self, client_with_stub_model):
        # A plain text file should be rejected by magic-byte detection
        resp = client_with_stub_model.post(
            "/analyze",
            files={"file": ("report.txt", b"hello world", "text/plain")},
        )
        assert resp.status_code == 415

    def test_oversized_file_returns_400(self, client_with_stub_model):
        # Construct a payload larger than the 100 MB limit.
        # We fake the PNG header so filetype would accept it, but size check
        # runs first so we just send random bytes that exceed the limit.
        big = b"\x00" * (101 * 1024 * 1024)
        resp = client_with_stub_model.post(
            "/analyze",
            files={"file": ("big.png", big, "image/png")},
        )
        assert resp.status_code == 400
        assert "too large" in resp.json()["detail"].lower()

    def test_empty_filename_returns_400(self, client_with_stub_model):
        resp = client_with_stub_model.post(
            "/analyze",
            files={"file": ("", make_png_bytes(), "image/png")},
        )
        assert resp.status_code == 400


class TestAnalyzeImage:
    def test_valid_png_returns_200(self, client_with_stub_model):
        resp = client_with_stub_model.post(
            "/analyze",
            files={"file": ("photo.png", make_png_bytes(), "image/png")},
        )
        assert resp.status_code == 200

    def test_response_schema(self, client_with_stub_model):
        body = client_with_stub_model.post(
            "/analyze",
            files={"file": ("photo.png", make_png_bytes(), "image/png")},
        ).json()

        required_fields = {
            "file_name",
            "file_type",
            "verdict",
            "authenticity_score",
            "raw_scores",
            "indicators",
            "explanation",
            "limitations",
            "is_demo",
        }
        assert required_fields <= body.keys()

    def test_authenticity_score_in_range(self, client_with_stub_model):
        body = client_with_stub_model.post(
            "/analyze",
            files={"file": ("photo.png", make_png_bytes(), "image/png")},
        ).json()
        assert 0 <= body["authenticity_score"] <= 100

    def test_raw_scores_sum_to_one(self, client_with_stub_model):
        body = client_with_stub_model.post(
            "/analyze",
            files={"file": ("photo.png", make_png_bytes(), "image/png")},
        ).json()
        scores = body["raw_scores"]
        total = scores["fake"] + scores["real"]
        assert abs(total - 1.0) < 0.01

    def test_verdict_is_valid_enum(self, client_with_stub_model):
        body = client_with_stub_model.post(
            "/analyze",
            files={"file": ("photo.png", make_png_bytes(), "image/png")},
        ).json()
        assert body["verdict"] in ("authentic", "suspicious", "likely_fake")

    def test_limitations_non_empty(self, client_with_stub_model):
        body = client_with_stub_model.post(
            "/analyze",
            files={"file": ("photo.png", make_png_bytes(), "image/png")},
        ).json()
        assert isinstance(body["limitations"], list)
        assert len(body["limitations"]) > 0
