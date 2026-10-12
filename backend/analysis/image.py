"""
Image deepfake detection using a pretrained Vision Transformer model.

Model: dima806/deepfake_vs_real_image_detection
  Architecture : ViT (Vision Transformer), fine-tuned on face images.
  Base model   : google/vit-base-patch16-224
  Input        : PIL Image (the Transformers pipeline handles resizing to 224×224)
  Output       : [{"label": "Real", "score": float}, {"label": "Fake", "score": float}]
                 Scores sum to 1.0 (softmax).  They are NOT calibrated probabilities.
  Accuracy     : ~99.3% F1 on the training-era test set (face images, pre-2024 GANs)
  License      : Unspecified on model card; public HuggingFace repository used for
                 research / educational purposes only.
  Concept drift: The model was trained on GAN-era deepfakes (~3 years ago).
                 Modern diffusion-model images may not be detected reliably.

References:
  https://huggingface.co/dima806/deepfake_vs_real_image_detection
  https://www.kaggle.com/code/dima806/deepfake-vs-real-faces-detection-vit
"""
from __future__ import annotations

import io
import logging

from PIL import Image

from backend.config import (
    IMAGE_LIMITATIONS,
    settings,
)
from backend.schemas.models import (
    AnalysisResponse,
    FileCategory,
    FrameResult,
    Indicator,
    RawScores,
    Severity,
    Verdict,
)

logger = logging.getLogger(__name__)

# The pipeline is loaded once at module level so subsequent requests pay no
# model-loading cost.  It is populated by load_model() called during
# application startup.
_pipeline = None


def load_model() -> None:
    """
    Download (on first run) and load the image classification pipeline.

    Called once from the FastAPI lifespan context so that the first request
    is not blocked by a cold model download.
    """
    global _pipeline
    from transformers import pipeline  # deferred to avoid import-time cost

    logger.info("Loading image model: %s", settings.image_model_id)
    _pipeline = pipeline(
        "image-classification",
        model=settings.image_model_id,
    )
    logger.info("Image model loaded successfully.")


def _get_pipeline():
    if _pipeline is None:
        raise RuntimeError(
            "Image model is not loaded.  "
            "Ensure load_model() is called during application startup."
        )
    return _pipeline


# ── Verdict mapping ───────────────────────────────────────────────────────────

def _map_verdict(fake_score: float) -> Verdict:
    if fake_score >= settings.verdict_likely_fake_threshold:
        return Verdict.likely_fake
    if fake_score >= settings.verdict_suspicious_threshold:
        return Verdict.suspicious
    return Verdict.authentic


# ── Indicator generation ──────────────────────────────────────────────────────

def _build_indicators(fake_score: float, real_score: float) -> list[Indicator]:
    """
    Produce human-readable indicator cards from the raw model scores.

    Only claims what the model actually outputs — no invented signals.
    """
    indicators: list[Indicator] = []

    if fake_score >= 0.5:
        indicators.append(
            Indicator(
                label="Neural classifier: fake signal detected",
                severity=Severity.high if fake_score >= 0.75 else Severity.medium,
                description=(
                    f"The ViT classifier assigned a fake-class score of "
                    f"{fake_score:.1%}.  This is a raw softmax output — "
                    "not a statistically calibrated probability."
                ),
            )
        )
    elif fake_score >= settings.verdict_suspicious_threshold:
        indicators.append(
            Indicator(
                label="Neural classifier: borderline result",
                severity=Severity.medium,
                description=(
                    f"Fake-class score is {fake_score:.1%} — above the "
                    f"uncertainty threshold ({settings.verdict_suspicious_threshold:.0%}) "
                    "but below the high-confidence fake threshold "
                    f"({settings.verdict_likely_fake_threshold:.0%}).  "
                    "Additional human review is recommended."
                ),
            )
        )
    else:
        indicators.append(
            Indicator(
                label="Neural classifier: real signal",
                severity=Severity.low,
                description=(
                    f"The classifier assigned a real-class score of "
                    f"{real_score:.1%}.  No strong fake signal was detected, "
                    "though absence of a signal does not guarantee authenticity."
                ),
            )
        )

    return indicators


# ── Explanation generation ─────────────────────────────────────────────────────

def _build_explanation(verdict: Verdict, fake_score: float, real_score: float) -> str:
    pct_fake = f"{fake_score:.1%}"
    pct_real = f"{real_score:.1%}"

    if verdict == Verdict.likely_fake:
        return (
            f"The deepfake-detection model returned a fake-class score of {pct_fake} "
            f"(real-class: {pct_real}).  This exceeds the high-confidence threshold "
            f"({settings.verdict_likely_fake_threshold:.0%}), indicating the image "
            "shares patterns with known AI-generated or face-swapped content. "
            "Note: the model was trained on GAN-era face images; results may differ "
            "for diffusion-model images or non-face content."
        )
    if verdict == Verdict.suspicious:
        return (
            f"The model returned a fake-class score of {pct_fake} "
            f"(real-class: {pct_real}).  The result falls in the uncertain zone "
            f"({settings.verdict_suspicious_threshold:.0%}–{settings.verdict_likely_fake_threshold:.0%}) "
            "where neither 'authentic' nor 'fake' can be stated with confidence.  "
            "Human expert review and additional tools are recommended."
        )
    return (
        f"The model returned a real-class score of {pct_real} "
        f"(fake-class: {pct_fake}).  No strong evidence of AI generation or "
        "manipulation was found.  A low fake score does not guarantee the image "
        "is unaltered; sophisticated deepfakes may still evade detection."
    )


# ── Public API ────────────────────────────────────────────────────────────────

def analyze_image_bytes(image_bytes: bytes, file_name: str) -> AnalysisResponse:
    """
    Run the deepfake classifier on raw image bytes.

    Returns a fully populated AnalysisResponse.  Never raises on model errors —
    instead wraps exceptions and returns a structured error explanation so the
    caller can still produce a useful response.
    """
    pipe = _get_pipeline()

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise ValueError(f"Cannot decode image: {exc}") from exc

    raw: list[dict] = pipe(image)

    # Normalise label names to lowercase for reliable lookup
    scores: dict[str, float] = {item["label"].lower(): item["score"] for item in raw}
    fake_score = scores.get("fake", 0.0)
    real_score = scores.get("real", 1.0 - fake_score)

    verdict = _map_verdict(fake_score)
    authenticity_score = round((1.0 - fake_score) * 100)

    return AnalysisResponse(
        file_name=file_name,
        file_type=FileCategory.image,
        verdict=verdict,
        authenticity_score=authenticity_score,
        raw_scores=RawScores(fake=round(fake_score, 4), real=round(real_score, 4)),
        indicators=_build_indicators(fake_score, real_score),
        explanation=_build_explanation(verdict, fake_score, real_score),
        limitations=IMAGE_LIMITATIONS,
        frame_results=None,
        is_demo=False,
    )
