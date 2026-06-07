"""YOLOv8-pose backend for bench form-check — the minimal detector swap (Path B).

The MediaPipe backend (pose.py) fails to detect the LYING/foreshortened lifter
in busy gyms (see memory: formcheck-failure-modes). YOLOv8-pose, COCO-trained,
detects the lifter in all 5 sample clips. This module swaps ONLY the detector:
it runs YOLO per frame, maps each detected person's COCO-17 keypoints into the
same 33-slot BlazePose layout the rest of the pipeline already uses, and then
reuses pose.py's proven, model-agnostic track-linking + lifter selection
(`select_lifter_track`) and interpolation verbatim. Downstream analysis.py and
visual_eval.py work unchanged.

Deliberately minimal (council Path B): no ByteTrack, no rotation probe, no crop
re-pass yet — the detector was the broken part, and the visual harness will say
whether any of that is actually needed. For bench the wrist IS the bar, so the
plate tracker (bar.py) is skipped by the caller.
"""

from __future__ import annotations

import os

import cv2
import numpy as np

import pose as P

DEFAULT_MODEL = os.path.join(os.path.dirname(__file__), "yolov8x-pose.pt")

# COCO-17 keypoint index -> BlazePose-33 index. Only the 12 joints the bench
# analysis uses (wrist/elbow/shoulder/hip/knee/ankle); YOLO returns a plausible
# coordinate for every keypoint (even low-confidence ones), so no NaN handling
# is needed — confidence rides along as `vis` and gates downstream use.
COCO_TO_BP = {
    5: P.L_SH, 6: P.R_SH,
    7: P.L_EL, 8: P.R_EL,
    9: P.L_WR, 10: P.R_WR,
    11: P.L_HIP, 12: P.R_HIP,
    13: P.L_KN, 14: P.R_KN,
    15: P.L_AN, 16: P.R_AN,
}


def _read_strided(video_path: str, max_frames: int):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError("could not open video")
    raw_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    # Mirror pose.py: cap detection at ~24 fps so rep timing is preserved but
    # high-fps phone clips aren't needlessly slow, and bar/analysis stay aligned.
    stride = max(1, round(raw_fps / 24.0))
    fps = raw_fps / stride
    frames: list[np.ndarray] = []
    idx = 0
    while len(frames) < max_frames:
        ok, fr = cap.read()
        if not ok:
            break
        if idx % stride == 0:
            frames.append(fr)
        idx += 1
    cap.release()
    return frames, fps, stride, w, h


def _candidates_from_result(res, aspect: float) -> list[dict]:
    """One pose.py-style candidate dict per detected person, so the existing
    selector can consume YOLO detections with no changes."""
    cands: list[dict] = []
    kp = getattr(res, "keypoints", None)
    if kp is None or kp.xyn is None or len(kp.xyn) == 0:
        return cands
    xyn = kp.xyn.cpu().numpy()                      # (people, 17, 2) normalised
    conf = (kp.conf.cpu().numpy() if kp.conf is not None
            else np.ones(xyn.shape[:2], dtype=np.float64))
    for i in range(xyn.shape[0]):
        xy33 = np.zeros((33, 2), dtype=np.float64)
        vis33 = np.zeros(33, dtype=np.float64)
        for c, bp in COCO_TO_BP.items():
            xy33[bp] = xyn[i, c]
            vis33[bp] = conf[i, c]
        cands.append(P._candidate(xy33, vis33, aspect))
    return cands


def track_pose(
    video_path: str, lift: str = "bench", model_path: str = DEFAULT_MODEL,
    max_frames: int = 1200, model=None,
) -> P.PoseTrack:
    from ultralytics import YOLO

    frames, fps, stride, w, h = _read_strided(video_path, max_frames)
    if len(frames) < 6:
        raise RuntimeError("clip too short or unreadable (need >= 6 frames)")
    aspect = w / h

    if model is None:
        model = YOLO(model_path)

    per_frame = [_candidates_from_result(model(fr, verbose=False)[0], aspect) for fr in frames]

    # Reuse the proven, model-agnostic selector: links detections into tracks,
    # commits to the lying lifter, rejects upright spotters, interpolates gaps.
    xy, vis, count = P.select_lifter_track(per_frame, fps, lift=lift)

    return P.PoseTrack(
        xy=xy,
        vis=vis,
        fps=float(fps),
        frame_size=(w, h),
        sample_frame=frames[len(frames) // 2],
        detected_frames=count,
        stride=stride,
    )
