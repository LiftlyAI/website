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

# Inference resolution and detection floor. 960 (up from the 640 default) is the
# main full-frame lever for a foreshortened / low-angle / small-in-frame lifter
# whose keypoints come back as a scribble at 640; CONF is lowered so the lifter —
# often a lower-confidence detection than a bystander — still surfaces. The
# selector below commits to the lifter, so extra low-conf detections are safe.
IMGSZ = 960
CONF = 0.15

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


def _detect_candidates(
    model, frame: np.ndarray, aspect: float, w: int, h: int, crop=None,
) -> list[dict]:
    """Run YOLO on `frame` (or a crop of it, upscaled) and return one pose.py-
    style candidate dict per detected person in ORIGINAL-frame normalised coords,
    so the existing selector consumes YOLO detections with no changes.

    `crop` is an (x0, y0, cw, ch) box in original pixels. Cropping to the lifter
    and upscaling gives a small/foreshortened lifter far more pixels — the single
    biggest lever for coverage — and keypoints are mapped back to the full frame
    so candidates stay comparable across passes (mirrors pose.py's crop re-pass)."""
    if crop is None:
        img = frame
        x0 = y0 = 0
        cw, ch = w, h
    else:
        x0, y0, cw, ch = crop
        sub = frame[y0:y0 + ch, x0:x0 + cw]
        if sub.size == 0:
            return []
        scale = 720.0 / max(1, max(cw, ch))   # upscale small crops, don't shrink big ones
        img = (cv2.resize(sub, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)
               if scale > 1.05 else sub)

    res = model(img, imgsz=IMGSZ, conf=CONF, verbose=False)[0]
    kp = getattr(res, "keypoints", None)
    if kp is None or kp.xyn is None or len(kp.xyn) == 0:
        return []
    xyn = kp.xyn.cpu().numpy()                      # (people, 17, 2) normalised to img
    conf = (kp.conf.cpu().numpy() if kp.conf is not None
            else np.ones(xyn.shape[:2], dtype=np.float64))
    cands: list[dict] = []
    for i in range(xyn.shape[0]):
        xy33 = np.zeros((33, 2), dtype=np.float64)
        vis33 = np.zeros(33, dtype=np.float64)
        for c, bp in COCO_TO_BP.items():
            x, y = xyn[i, c]
            if crop is not None:                     # crop space -> original frame
                x = (x0 + x * cw) / w
                y = (y0 + y * ch) / h
            xy33[bp] = (x, y)
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

    per_frame = [_detect_candidates(model, fr, aspect, w, h) for fr in frames]

    # Reuse the proven, model-agnostic selector: links detections into tracks,
    # commits to the lying lifter, rejects upright spotters, interpolates gaps.
    xy, vis, count = P.select_lifter_track(per_frame, fps, lift=lift)

    # Second pass: a small/foreshortened/low-angle lifter is the main cause of
    # missed frames (e.g. a close deadlift filmed up from the floor). If coverage
    # is low, crop to the lifter and re-detect upscaled — the same recovery the
    # MediaPipe path uses (pose.py:496-509). Keep it only if it tracks more frames.
    coverage = count / max(1, len(frames))
    if coverage < 0.75:
        crop = P._lifter_crop(xy, vis, w, h)
        if crop is not None:
            per_frame2 = [_detect_candidates(model, fr, aspect, w, h, crop=crop)
                          for fr in frames]
            try:
                xy2, vis2, count2 = P.select_lifter_track(per_frame2, fps, lift=lift)
                if count2 > count:
                    xy, vis, count = xy2, vis2, count2
            except RuntimeError:
                pass  # crop pass found nothing usable — keep the full-frame result

    return P.PoseTrack(
        xy=xy,
        vis=vis,
        fps=float(fps),
        frame_size=(w, h),
        sample_frame=frames[len(frames) // 2],
        detected_frames=count,
        stride=stride,
    )
