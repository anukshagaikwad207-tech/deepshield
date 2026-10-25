"""
Video deepfake detection via frame sampling.

Strategy:
  1. Write the uploaded bytes to a temporary file (OpenCV requires a path).
  2. Determine total frame count and select up to `settings.video_max_frames`
     evenly spaced frame indices.
  3. Decode each frame, convert BGR → RGB, wrap in a PIL Image.
  4. Run each frame through the image deepfake classifier.
  5. Aggregate per-frame scores: mean fake score, worst frame, variance.
  6. Map aggregated score to a verdict using the same thresholds as images.

Limitations:
  - Only `settings.video_max_frames` frames are examined; manipulation between
    sampled frames may be missed entirely.
  - Inherits all limitations of the image model (see analysis/image.py).
  - Requires opencv-python-headless.
"""
from __future__ import annotations

import io
import logging
import statistics
import tempfile
import os

import cv2
from PIL import Image

from backend.config import VIDEO_LIMITATIONS, settings
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


def _extract_frames(video_path: str, max_frames: int) -> list[tuple[int, float, Image.Image]]:
    """
    Extract up to `max_frames` evenly spaced frames from the video at
    `video_path`.

    Returns a list of (frame_index, timestamp_seconds, PIL.Image) tuples.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"OpenCV could not open video file: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0

    if total_frames <= 0:
        cap.release()
        raise ValueError("Video contains no readable frames.")

    # Evenly spaced frame indices
    if total_frames <= max_frames:
        indices = list(range(total_frames))
    else:
        step = total_frames / max_frames
        indices = [round(i * step) for i in range(max_frames)]

    frames: list[tuple[int, float, Image.Image]] = []
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, bgr = cap.read()
        if not ret:
            continue
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        timestamp = idx / fps
        frames.append((idx, round(timestamp, 2), Image.fromarray(rgb)))

    cap.release()
    return frames


def _aggregate_verdict(fake_scores: list[float]) -> tuple[Verdict, float]:
    """
    Aggregate per-frame fake scores into a single verdict.

    Uses the mean fake score for the overall verdict but surfaces the worst
    frame via indicators so users understand partial-video results.
    """
    if not fake_scores:
        return Verdict.suspicious, 0.5

    mean_fake = statistics.mean(fake_scores)
    if mean_fake >= settings.verdict_likely_fake_threshold:
        return Verdict.likely_fake, mean_fake
    if mean_fake >= settings.verdict_suspicious_threshold:
        return Verdict.suspicious, mean_fake
    return Verdict.authentic, mean_fake


def _build_video_indicators(
    fake_scores: list[float],
    frame_results: list[FrameResult],
    mean_fake: float,
) -> list[Indicator]:
    indicators: list[Indicator] = []

    worst = max(frame_results, key=lambda f: f.fake_score)
    best = min(frame_results, key=lambda f: f.fake_score)

    # Overall classifier signal
    if mean_fake >= 0.5:
        indicators.append(
            Indicator(
                label="Mean frame score: fake signal",
                severity=Severity.high if mean_fake >= 0.75 else Severity.medium,
                description=(
                    f"Averaging across {len(frame_results)} sampled frames, the "
                    f"classifier returned a mean fake score of {mean_fake:.1%}.  "
                    "Raw softmax score — not a calibrated probability."
                ),
            )
        )
    else:
        indicators.append(
            Indicator(
                label="Mean frame score: real signal",
                severity=Severity.low,
                description=(
                    f"Mean fake score across {len(frame_results)} frames: "
                    f"{mean_fake:.1%}.  No strong synthetic signal detected on average."
                ),
            )
        )

    # Worst frame
    if worst.fake_score >= settings.verdict_suspicious_threshold:
        indicators.append(
            Indicator(
                label=f"Highest-risk frame at {worst.timestamp_seconds:.1f}s",
                severity=Severity.high if worst.fake_score >= 0.75 else Severity.medium,
                description=(
                    f"Frame {worst.frame_index} (t={worst.timestamp_seconds:.1f}s) "
                    f"scored {worst.fake_score:.1%} on the fake class — the highest "
                    "score seen across sampled frames."
                ),
            )
        )

    # Score variance — high variance suggests localised manipulation
    if len(fake_scores) > 1:
        variance = statistics.pstdev(fake_scores)
        if variance >= 0.15:
            indicators.append(
                Indicator(
                    label="High score variance across frames",
                    severity=Severity.medium,
                    description=(
                        f"Frame scores range from {best.fake_score:.1%} to "
                        f"{worst.fake_score:.1%} (std dev {variance:.2f}).  "
                        "Large variance may indicate localised manipulation or "
                        "varying image quality across the video."
                    ),
                )
            )

    return indicators


def _build_video_explanation(
    verdict: Verdict,
    mean_fake: float,
    n_frames: int,
    worst_ts: float,
) -> str:
    pct = f"{mean_fake:.1%}"
    if verdict == Verdict.likely_fake:
        return (
            f"Analysing {n_frames} evenly spaced frames, the classifier returned "
            f"a mean fake-class score of {pct}.  This exceeds the high-confidence "
            f"threshold ({settings.verdict_likely_fake_threshold:.0%}), suggesting "
            "a significant portion of the video may be synthetically generated or "
            f"face-swapped.  The highest individual frame score was at "
            f"{worst_ts:.1f}s.  Only sampled frames were examined — short-duration "
            "manipulation between those frames may be missed."
        )
    if verdict == Verdict.suspicious:
        return (
            f"The mean fake-class score across {n_frames} sampled frames is {pct}, "
            "which falls in the uncertain range.  Some frames showed elevated scores "
            "while others appeared natural.  Independent verification with additional "
            "tools is strongly recommended."
        )
    return (
        f"Across {n_frames} sampled frames, the mean fake-class score is {pct}.  "
        "No strong evidence of AI-generated or face-swapped content was detected "
        "in the examined frames.  Note that only a subset of frames was analysed."
    )


def analyze_video_bytes(video_bytes: bytes, file_name: str) -> AnalysisResponse:
    """
    Analyse a video file for deepfake content via frame sampling.

    Writes bytes to a temporary file, extracts frames, runs the image model
    on each, and aggregates results.  The temporary file is always deleted.
    """
    from backend.analysis.image import _get_pipeline, _build_indicators as _img_indicators, extract_model_scores

    # Write to a temp file so OpenCV can open it by path
    suffix = _guess_suffix(file_name)
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        frames = _extract_frames(tmp_path, settings.video_max_frames)
    finally:
        os.unlink(tmp_path)

    if not frames:
        raise ValueError("No frames could be extracted from the video.")

    pipe = _get_pipeline()
    frame_results: list[FrameResult] = []
    fake_scores: list[float] = []

    for frame_idx, timestamp, pil_image in frames:
        raw = pipe(pil_image)
        fake, real = extract_model_scores(raw)
        fake_scores.append(fake)
        frame_results.append(
            FrameResult(
                frame_index=frame_idx,
                timestamp_seconds=timestamp,
                fake_score=round(fake, 4),
                real_score=round(real, 4),
            )
        )

    verdict, mean_fake = _aggregate_verdict(fake_scores)
    mean_real = 1.0 - mean_fake
    authenticity_score = round((1.0 - mean_fake) * 100)
    worst = max(frame_results, key=lambda f: f.fake_score)

    return AnalysisResponse(
        file_name=file_name,
        file_type=FileCategory.video,
        verdict=verdict,
        authenticity_score=authenticity_score,
        raw_scores=RawScores(fake=round(mean_fake, 4), real=round(mean_real, 4)),
        indicators=_build_video_indicators(fake_scores, frame_results, mean_fake),
        explanation=_build_video_explanation(verdict, mean_fake, len(frame_results), worst.timestamp_seconds),
        limitations=VIDEO_LIMITATIONS,
        frame_results=frame_results,
        is_demo=False,
    )


def _guess_suffix(file_name: str) -> str:
    ext = os.path.splitext(file_name)[-1].lower()
    return ext if ext else ".mp4"
