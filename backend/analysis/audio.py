"""
Audio deepfake detection — integration point (not yet implemented).

A suitable model has not yet been selected.  Candidate approaches include:

  wav2vec2-based classifiers
    - Several HuggingFace models fine-tuned on the ASVspoof dataset exist,
      e.g. from the PyData Global 2024 talk by Adriana Stan.
    - Input: 16 kHz mono WAV; output: binary real/spoof label.

  RawNet2 / AASIST
    - State-of-the-art anti-spoofing models from ASVspoof 2021 challenge.
    - Available at https://github.com/clovaai/aasist

  Resemblyzer + anomaly detection
    - Speaker-embedding-based approach; no dedicated deepfake training data
      required but higher false-positive rate.

Until a model is selected, validated, and integrated, this module returns a
clearly marked placeholder response so the API contract is stable and the
frontend can handle audio uploads without crashing.

DO NOT rely on the scores returned here for any real decision.
"""
from __future__ import annotations

from backend.config import AUDIO_LIMITATIONS
from backend.schemas.models import (
    AnalysisResponse,
    FileCategory,
    Indicator,
    RawScores,
    Severity,
    Verdict,
)

_PLACEHOLDER_EXPLANATION = (
    "Audio deepfake detection has not yet been implemented in this backend.  "
    "The score and verdict shown below are placeholder values — they carry no "
    "analytical meaning and must not be used as evidence of authenticity or manipulation.  "
    "A suitable pretrained model (e.g. wav2vec2-based, AASIST) will be integrated "
    "in a future release."
)

_PLACEHOLDER_INDICATOR = Indicator(
    label="Audio analysis: not implemented",
    severity=Severity.low,
    description=(
        "No real model was run on this audio file.  "
        "The result is a structural placeholder only."
    ),
)


def analyze_audio_bytes(audio_bytes: bytes, file_name: str) -> AnalysisResponse:
    """
    Placeholder audio analysis.

    Returns a fixed neutral result clearly marked as unimplemented.
    The `is_demo` flag is set to True so the frontend can surface the
    appropriate warning to users.
    """
    return AnalysisResponse(
        file_name=file_name,
        file_type=FileCategory.audio,
        verdict=Verdict.suspicious,
        authenticity_score=50,
        raw_scores=RawScores(fake=0.5, real=0.5),
        indicators=[_PLACEHOLDER_INDICATOR],
        explanation=_PLACEHOLDER_EXPLANATION,
        limitations=AUDIO_LIMITATIONS,
        frame_results=None,
        is_demo=True,  # Honest flag: no real inference was run
    )
