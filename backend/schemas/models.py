"""
Pydantic schemas for API request validation and response serialisation.
"""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class FileCategory(str, Enum):
    image = "image"
    video = "video"
    audio = "audio"


class Verdict(str, Enum):
    authentic = "authentic"
    suspicious = "suspicious"
    likely_fake = "likely_fake"


class Severity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Indicator(BaseModel):
    label: str
    severity: Severity
    description: str


class FrameResult(BaseModel):
    """Per-frame analysis result for video files."""
    frame_index: int
    timestamp_seconds: float
    fake_score: float = Field(ge=0.0, le=1.0)
    real_score: float = Field(ge=0.0, le=1.0)


class RawScores(BaseModel):
    """Raw softmax scores from the model.

    These are NOT calibrated probabilities.  See config.IMAGE_LIMITATIONS.
    """
    fake: float = Field(ge=0.0, le=1.0)
    real: float = Field(ge=0.0, le=1.0)


class AnalysisResponse(BaseModel):
    """
    Structured result returned by POST /analyze.

    The 'authenticity_score' is an integer 0-100 derived from (1 - fake_score)
    and intended as a human-readable signal, not a statistical probability.
    """
    file_name: str
    file_type: FileCategory
    verdict: Verdict
    authenticity_score: int = Field(ge=0, le=100)
    raw_scores: RawScores
    indicators: list[Indicator]
    explanation: str
    limitations: list[str]
    frame_results: Optional[list[FrameResult]] = None
    is_demo: bool = False


class ErrorResponse(BaseModel):
    detail: str
