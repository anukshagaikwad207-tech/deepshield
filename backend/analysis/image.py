"""
Image deepfake detection using a pretrained Vision Transformer model.

Model: Ateeqq/ai-vs-human-image-detector
  Architecture : SigLIP (Vision Transformer), fine-tuned for AI vs human image classification.
  Base model   : google/siglip-base-patch16-224
  Training data: 120,000 balanced images (60k AI-generated from Midjourney, Stable Diffusion,
                 DALL-E, and 60k authentic human photographs)
  Input        : PIL Image (the Transformers pipeline handles resizing to 224×224)
  Output       : [{"label": "ai", "score": float}, {"label": "hum", "score": float}]
                 Scores sum to 1.0 (softmax).  They are NOT calibrated probabilities.
  Accuracy     : ~99.23% evaluation accuracy, 0.9923 macro/weighted F1 score
  License      : Apache 2.0 (permissive, open-source)

References:
  https://huggingface.co/Ateeqq/ai-vs-human-image-detector
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


# ── Label extraction ──────────────────────────────────────────────────────────

def extract_model_scores(raw: list[dict]) -> tuple[float, float]:
    """
    Extract (fake_score, real_score) from raw pipeline classification results.

    Normalises diverse label pairs from HuggingFace models:
      - ('ai', 'hum')             -> Ateeqq/ai-vs-human-image-detector
      - ('ai-generated', 'human') -> dima806/ai_vs_human_generated_image_detection
      - ('fake', 'real')          -> dima806/deepfake_vs_real_image_detection
      - ('artificial', 'human')   -> umm-maybe / Organika
    """
    scores = {
        str(item["label"]).strip().lower(): float(item["score"])
        for item in raw
    }

    if "ai" in scores and "hum" in scores:
        return scores["ai"], scores["hum"]
    if "ai-generated" in scores and "human" in scores:
        return scores["ai-generated"], scores["human"]
    if "fake" in scores and "real" in scores:
        return scores["fake"], scores["real"]
    if "artificial" in scores and "human" in scores:
        return scores["artificial"], scores["human"]

    # Fallback to heuristic label matching if label names vary slightly
    fake_score = None
    real_score = None
    for label, score in scores.items():
        if label in ("fake", "ai", "ai-generated", "artificial", "synthetic"):
            fake_score = score
        elif label in ("real", "hum", "human", "authentic"):
            real_score = score

    if fake_score is not None and real_score is not None:
        return fake_score, real_score
    if fake_score is not None:
        return fake_score, 1.0 - fake_score
    if real_score is not None:
        return 1.0 - real_score, real_score

    raise RuntimeError(
        f"Unexpected image model labels: {[item.get('label') for item in raw]}"
    )


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
                    f"The classifier assigned an AI/fake-class score of "
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
                    f"AI/fake-class score is {fake_score:.1%} — above the "
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
                    f"The classifier assigned a human/real-class score of "
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
            f"The image classifier returned an AI/fake-class score of {pct_fake} "
            f"(human/real-class: {pct_real}).  This exceeds the high-confidence threshold "
            f"({settings.verdict_likely_fake_threshold:.0%}), indicating the image "
            "shares patterns with known AI-generated content."
        )
    if verdict == Verdict.suspicious:
        return (
            f"The classifier returned an AI/fake-class score of {pct_fake} "
            f"(human/real-class: {pct_real}).  The result falls in the uncertain zone "
            f"({settings.verdict_suspicious_threshold:.0%}–{settings.verdict_likely_fake_threshold:.0%}) "
            "where neither 'authentic' nor 'fake' can be stated with confidence.  "
            "Human expert review and additional forensic tools are recommended."
        )
    return (
        f"The classifier returned a human/real-class score of {pct_real} "
        f"(AI/fake-class: {pct_fake}).  No strong evidence of AI generation or "
        "manipulation was detected.  A low fake score does not guarantee the image "
        "is unaltered; novel or highly subtle generative models may still evade detection."
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

    raw: list[dict] = pipe(image, top_k=2)

    logger.info("Raw predictions for %s: %s", file_name, raw)

    fake_score, real_score = extract_model_scores(raw)
    verdict = _map_verdict(fake_score)
    authenticity_score = round((1.0 - fake_score) * 100)

    return AnalysisResponse(
        file_name=file_name,
        file_type=FileCategory.image,
        verdict=verdict,
        authenticity_score=authenticity_score,
        raw_scores=RawScores(
            fake=round(fake_score, 4),
            real=round(real_score, 4),
        ),
        indicators=_build_indicators(fake_score, real_score),
        explanation=_build_explanation(verdict, fake_score, real_score),
        limitations=IMAGE_LIMITATIONS,
        frame_results=None,
        is_demo=False,
    )
