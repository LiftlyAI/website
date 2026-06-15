"""P2 day-1 spike: model bake-off on 6 representative clips.

Backends: yolov8x-pose (current prod), yolo11x-pose (drop-in), RTMPose-m via
rtmlib PoseTracker (ONNX, the latency play). Each runs on the SAME 300-frame
mid-clip window; every backend's keypoints are remapped into the BlazePose-33
layout and pushed through the EXISTING pose.select_lifter_track, so the score
is end-to-end "did we get a usable lifter track", not raw AP.

Metrics per backend/clip:
  fps        — wall-clock inference throughput (CPU)
  det%       — frames with >=1 person detected
  cov%       — selector coverage of the chosen lifter track
  move       — selected track's shoulder y-range / torso (a real lifter
               moves >=0.3; ~0 = locked onto a bystander)

Decision rule (council): ties go to ultralytics (keeps model.track for P2).

Usage: .venv/Scripts/python.exe research/bakeoff.py [--frames 300]
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SVC = os.path.dirname(HERE)
ROOT = os.path.dirname(SVC)
sys.path.insert(0, SVC)

import pose as P  # noqa: E402
from pose_yolo import COCO_TO_BP  # noqa: E402

CLIPS = [
    ("sample_videos", "150 kg bench RPE 9.mp4", "bench"),      # spotter crowd
    ("sample_videos", "310 lb bench RPE 7.mp4", "bench"),      # plate occlusion
    ("research/clips", "bench__1jzn2i2.mp4", "bench"),         # clean side view
    ("research/clips", "squat_lowbar__1kn0yi5.mp4", "squat"),  # bystander trap
    ("research/clips", "squat_highbar__1kovzbg.mp4", "squat"), # far, busy gym
    ("research/clips", "deadlift_sumo__1jd0wuf.mp4", "deadlift"),  # plate occlusion
]


def read_window(path: str, n_frames: int):
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise RuntimeError(f"cannot open {path}")
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    start = max(0, int(total * 0.25))
    cap.set(cv2.CAP_PROP_POS_FRAMES, start)
    frames = []
    while len(frames) < n_frames:
        ok, fr = cap.read()
        if not ok:
            break
        frames.append(fr)
    cap.release()
    return frames, fps, w, h


def to_candidates(xy_px: np.ndarray, scores: np.ndarray, w: int, h: int, aspect: float):
    """(N,17,2) pixel keypoints + (N,17) scores -> pose.py candidate dicts."""
    cands = []
    for i in range(xy_px.shape[0]):
        xy33 = np.zeros((33, 2), dtype=np.float64)
        vis33 = np.zeros(33, dtype=np.float64)
        for c, bp in COCO_TO_BP.items():
            xy33[bp] = (xy_px[i, c, 0] / w, xy_px[i, c, 1] / h)
            vis33[bp] = float(scores[i, c])
        cands.append(P._candidate(xy33, vis33, aspect))
    return cands


def selected_metrics(per_frame, fps, lift, n):
    try:
        xy, vis, count = P.select_lifter_track(per_frame, fps, lift=lift)
    except RuntimeError as e:
        return 0.0, 0.0, f"refused: {str(e)[:40]}"
    cov = count / max(1, n)
    sh = (xy[:, P.L_SH, 1] + xy[:, P.R_SH, 1]) / 2.0
    hp = (xy[:, P.L_HIP, 1] + xy[:, P.R_HIP, 1]) / 2.0
    torso = float(np.nanmedian(np.abs(sh - hp))) or 0.1
    move = float(np.percentile(sh, 97) - np.percentile(sh, 3)) / torso
    return cov, move, ""


def run_yolo(weights: str, frames, w, h, aspect):
    from ultralytics import YOLO
    model = YOLO(weights)
    per_frame, det = [], 0
    t0 = time.time()
    for fr in frames:
        res = model(fr, imgsz=960, conf=0.15, verbose=False)[0]
        kp = getattr(res, "keypoints", None)
        if kp is None or kp.xy is None or len(kp.xy) == 0:
            per_frame.append([])
            continue
        det += 1
        xy = kp.xy.cpu().numpy()
        sc = (kp.conf.cpu().numpy() if kp.conf is not None
              else np.ones(xy.shape[:2]))
        per_frame.append(to_candidates(xy, sc, w, h, aspect))
    dt = time.time() - t0
    return per_frame, det, dt


def run_rtm(frames, w, h, aspect, det_freq=8):
    from rtmlib import Body, PoseTracker
    tracker = PoseTracker(Body, det_frequency=det_freq, mode="balanced",
                          backend="onnxruntime", device="cpu", tracking=False)
    per_frame, det = [], 0
    t0 = time.time()
    for fr in frames:
        kpts, scores = tracker(fr)
        if kpts is None or len(kpts) == 0:
            per_frame.append([])
            continue
        det += 1
        per_frame.append(to_candidates(np.asarray(kpts), np.asarray(scores), w, h, aspect))
    dt = time.time() - t0
    return per_frame, det, dt


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--frames", type=int, default=300)
    ap.add_argument("--backends", default="rtmpose,yolo11x,yolov8x")
    args = ap.parse_args()

    rows = []
    for dirn, name, lift in CLIPS:
        path = os.path.join(ROOT if dirn == "sample_videos" else SVC,
                            dirn if dirn == "sample_videos" else "research/clips", name)
        frames, fps, w, h = read_window(path, args.frames)
        n = len(frames)
        aspect = w / h
        stride = max(1, round(fps / 24.0))
        frames_s = frames[::stride]
        ns = len(frames_s)
        print(f"\n== {name} [{lift}] {ns} frames @ {w}x{h}")
        for backend in args.backends.split(","):
            try:
                if backend == "yolov8x":
                    pf, det, dt = run_yolo(os.path.join(SVC, "yolov8x-pose.pt"), frames_s, w, h, aspect)
                elif backend == "yolo11x":
                    pf, det, dt = run_yolo("yolo11x-pose.pt", frames_s, w, h, aspect)
                elif backend == "rtmpose":
                    pf, det, dt = run_rtm(frames_s, w, h, aspect)
                else:
                    continue
                cov, move, note = selected_metrics(pf, fps / stride, lift, ns)
                r = {"clip": name, "backend": backend, "fps": round(ns / dt, 2),
                     "detPct": round(det / ns, 2), "cov": round(cov, 2),
                     "move": round(move, 2), "note": note}
            except Exception as e:  # noqa: BLE001
                r = {"clip": name, "backend": backend, "error": f"{type(e).__name__}: {e}"}
            rows.append(r)
            print("   ", r)

    with open(os.path.join(HERE, "bakeoff.json"), "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2)
    print("\nwrote research/bakeoff.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
