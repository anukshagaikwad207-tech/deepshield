"""
Central configuration for the DeepShield AI backend.
All limits and model identifiers are defined here so they can be changed
without touching analysis logic.
"""
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Settings:
    # ── File limits ──────────────────────────────────────────────────────────
    max_upload_bytes: int = 100 * 1024 * 1024  # 100 MB

    # Allowed MIME types grouped by media category.
    # The validation layer checks the actual file magic bytes, NOT the
    # Content-Type header supplied by the client.
    allowed_image_types: tuple = (
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/bmp",
    )
    allowed_video_types: tuple = (
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "video/x-msvideo",
        "video/avi",
    )
    allowed_audio_types: tuple = (
        "audio/mpeg",
        "audio/wav",
        "audio/x-wav",
        "audio/ogg",
        "audio/flac",
        "audio/x-flac",
        "audio/aac",
        "audio/mp4",
    )

    # ── Image model ──────────────────────────────────────────────────────────
    # Ateeqq/ai-vs-human-image-detector
    # Architecture : SigLIP (Vision Transformer), fine-tuned from
    #                google/siglip-base-patch16-224
    # Training data: 120,000 images (60,000 AI-generated images from modern
    #                generators including Midjourney, Stable Diffusion, DALL-E,
    #                and 60,000 authentic human photographs)
    # Input        : PIL Image (auto-resized to 224×224 by the pipeline)
    # Output labels: "ai" (AI-generated) / "hum" (human / real)
    # Accuracy     : ~99.23% evaluation accuracy, 0.9923 F1 score
    # License      : Apache 2.0 (permissive, open-source)
    # Known limits : See IMAGE_LIMITATIONS below.
    image_model_id: str = "Ateeqq/ai-vs-human-image-detector"

    # ── Video sampling ───────────────────────────────────────────────────────
    # Maximum number of frames sampled per video for analysis.
    # Frames are spaced evenly across the full duration.
    video_max_frames: int = 8

    # ── Verdict thresholds ───────────────────────────────────────────────────
    # Raw fake-class softmax score boundaries used to map model output to a
    # three-way verdict.  These are heuristics, not statistically derived
    # calibration points.  Treat them as approximate guidance only.
    verdict_likely_fake_threshold: float = 0.65
    verdict_suspicious_threshold: float = 0.35


settings = Settings()

# ── Documented limitations ───────────────────────────────────────────────────
# These strings are returned in every API response so the frontend can
# surface them to users without hard-coding UI copy.

IMAGE_LIMITATIONS: list[str] = [
    "Model fine-tuned on modern AI-generated (Midjourney, Stable Diffusion, DALL-E) "
    "and authentic human images using a SigLIP Vision Transformer architecture.",
    "Softmax scores reported here are raw classifier outputs, not calibrated "
    "probabilities.  A score of 0.90 does not mean '90 % chance of being fake'.",
    "The model does not locate the manipulated region; it produces a single "
    "image-level prediction.",
    "Heavy JPEG compression, extreme cropping, or unusual colour grading can "
    "cause unexpected results.",
    "A 'real' verdict does not guarantee authenticity.  Novel or highly subtle "
    "generations may evade detection.",
]

VIDEO_LIMITATIONS: list[str] = [
    f"Only up to {settings.video_max_frames} evenly spaced frames are examined; "
    "short-duration manipulation between sampled frames may be missed.",
    *IMAGE_LIMITATIONS,
]

AUDIO_LIMITATIONS: list[str] = [
    "Audio deepfake detection is not yet implemented in this backend.  "
    "The result shown is a placeholder — do not rely on it for any decision.",
]
