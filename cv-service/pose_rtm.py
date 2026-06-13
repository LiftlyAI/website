"""RTMPose-m backend (rtmlib, ONNX) — the P2 production pose path.

Bake-off result (research/bakeoff.json, 2026-06-12): RTMPose-m via rtmlib is
20-50x faster than yolov8x-pose@960 on CPU (15-37 fps vs 0.3-3) AND recovers
85-100% selector coverage on every previously-broken hard clip (spotter
crowd, foreground-plate occlusion, far/busy gym, bystander trap). YOLOX-m
person detection runs every `det_frequency` frames; RTMPose runs every frame.

Keypoints are COCO-17 remapped into the BlazePose-33 layout (same map as
pose_yolo.COCO_TO_BP) and pushed through the existing, proven
pose.select_lifter_track — model swap, not pipeline rewrite.
"""

from __future__ import annotations

import os

import numpy as np

import pose as P
from pose_yolo import COCO_TO_BP, _read_strided

# det_frequency: person boxes are re-detected every N frames; pose runs every
# frame inside the cached boxes. 4 is conservative (lifters barely translate;
# spotters walk) while keeping the detector ~25% of total cost.
DET_FREQUENCY = 4


def _to_candidates(kpts, scores, w: int, h: int, aspect: float) -> list[dict]:
    """rtmlib output (N,17,2) PIXEL keypoints + (N,17) scores ->
    pose.py candidate dicts in normalised original-frame coords."""
    cands: list[dict] = []
    kpts = np.asarray(kpts, dtype=np.float64)
    scores = np.asarray(scores, dtype=np.float64)
    for i in range(kpts.shape[0]):
        xy33 = np.zeros((33, 2), dtype=np.float64)
        vis33 = np.zeros(33, dtype=np.float64)
        for c, bp in COCO_TO_BP.items():
            xy33[bp] = (kpts[i, c, 0] / w, kpts[i, c, 1] / h)
            vis33[bp] = scores[i, c]
        cands.append(P._candidate(xy33, vis33, aspect))
    return cands


_MODELS: dict = {}


def _model(mode: str):
    if mode not in _MODELS:
        from rtmlib import Body, PoseTracker
        m = PoseTracker(Body, det_frequency=DET_FREQUENCY, mode=mode,
                        backend="onnxruntime", device="cpu", tracking=False)
        # rtmlib's YOLOX ships with score_thr=0.7 — an occluded / far /
        # oddly-posed lifter hovers around that confidence and flips in and
        # out RUN TO RUN (coverage on one clip swung 19%..71%). The selector
        # safely ignores extra low-conf detections (proven at YOLO conf
        # 0.15), so detect generously and let selection do its job.
        try:
            m.det_model.score_thr = 0.35
        except AttributeError:
            pass
        _MODELS[mode] = m
    return _MODELS[mode]


def _run_pass(model, frames, w, h, aspect, fps, lift, crop=None):
    # PoseTracker caches person boxes BETWEEN calls — without a reset, state
    # from the previous video bleeds into this one (coverage on the same clip
    # varied 96% -> 68% depending on what ran before it in a batch).
    import cv2

    if hasattr(model, "reset"):
        model.reset()
    per_frame = []
    for fr in frames:
        if crop is not None:
            x0, y0, cw, ch = crop
            sub = fr[y0:y0 + ch, x0:x0 + cw]
            scale = 720.0 / max(1, max(cw, ch))
            img = (cv2.resize(sub, None, fx=scale, fy=scale,
                              interpolation=cv2.INTER_LINEAR)
                   if scale > 1.05 else sub)
        else:
            img = fr
        kpts, scores = model(img)
        if kpts is None or len(kpts) == 0:
            per_frame.append([])
            continue
        kpts = np.asarray(kpts, dtype=np.float64)
        if crop is not None:
            if scale > 1.05:
                kpts = kpts / scale
            kpts[:, :, 0] += crop[0]
            kpts[:, :, 1] += crop[1]
        per_frame.append(_to_candidates(kpts, scores, w, h, aspect))
    return P.select_lifter_track(per_frame, fps, lift=lift)


# Escalate to the big model only when the fast one struggles. Balanced
# (RTMPose-m, ~15-40 fps CPU) covers most clips; performance (RTMPose-x +
# YOLOX-x) recovers small/far lifters (research: 46%->100%, 14%->71%) at
# ~3-7x the cost. Keep whichever pass tracked MORE — performance mode is
# not strictly better (one clip: 77% balanced vs 38% performance).
ESCALATE_BELOW = 0.60


def track_pose(
    # 450 frames (~19s at the 24fps detection cap) covers a form-check set of a
    # few reps. The old 1200 (~50s) × up to 3 CPU pose passes could run past
    # Modal's ~150s web-endpoint limit, which makes Modal return a 303 (no CORS
    # header) that the browser misreports as a CORS failure. Bounding frames
    # keeps worst-case analysis time under that wall.
    video_path: str, lift: str = "bench", max_frames: int = 450, model=None,
) -> P.PoseTrack:
    frames, fps, stride, w, h = _read_strided(video_path, max_frames)
    if len(frames) < 6:
        raise RuntimeError("clip too short or unreadable (need >= 6 frames)")
    aspect = w / h

    try:
        xy, vis, count = _run_pass(model or _model("balanced"),
                                   frames, w, h, aspect, fps, lift)
    except RuntimeError:
        xy, vis, count = None, None, 0

    if count / max(1, len(frames)) < ESCALATE_BELOW:
        try:
            xy2, vis2, count2 = _run_pass(_model("performance"),
                                          frames, w, h, aspect, fps, lift)
            if count2 > count:
                xy, vis, count = xy2, vis2, count2
        except RuntimeError:
            pass
    # Third tier: crop to the lifter and re-detect upscaled — the proven
    # recovery for a small / plate-occluded lifter (pose_yolo + pose.py both
    # use it). Keep it only if it tracks more frames.
    if xy is not None and count / max(1, len(frames)) < 0.75:
        crop = P._lifter_crop(xy, vis, w, h)
        if crop is not None:
            try:
                xy3, vis3, count3 = _run_pass(model or _model("balanced"),
                                              frames, w, h, aspect, fps, lift,
                                              crop=crop)
                if count3 > count:
                    xy, vis, count = xy3, vis3, count3
            except RuntimeError:
                pass
    if xy is None:
        raise RuntimeError(
            "no lifter detected — make sure the person performing the lift "
            "is fully in frame and well lit"
        )

    return P.PoseTrack(
        xy=xy,
        vis=vis,
        fps=float(fps),
        frame_size=(w, h),
        sample_frame=frames[len(frames) // 2],
        detected_frames=count,
        stride=stride,
    )


def make_model(mode: str = "balanced", det_frequency: int = DET_FREQUENCY):
    """Shared PoseTracker for batch runs (ONNX sessions are reusable)."""
    return _model(mode)
