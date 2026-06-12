"""Visual eval harness for the bench form-check pipeline.

The OLD eval_samples.py judged success by "RPE in band" — a proxy that
reported green for months while every overlay was visibly broken. This harness
judges the only thing that matters: WHAT THE OVERLAY SHOWS. For each clip it
runs the current pipeline and renders an unambiguous diagnostic image so a
human can answer, by eye:

  1. correct-person  — is the skeleton on the LIFTER, never the spotter?
  2. bar-path-on-bar — does the traced path sit on the barbell line?
  3. rep-count       — does it match what the clip shows?
  4. RPE             — does it match the label in the filename?

It draws the selected lifter at three moments (so a mid-rep glance can't hide a
wrong-person lock that only shows at the ends), the full bar/wrist path, and a
header band with every metric next to the filename ground truth. It also times
each stage (pose / bar / analysis) so we know CPU latency BEFORE deciding on any
heavier model.

Usage:
    .venv/Scripts/python.exe visual_eval.py [--dir ../sample_videos] [--only 150]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import traceback

import cv2
import numpy as np

import pose as P

GT_RE = re.compile(r"rpe\s*(\d+(?:\.\d+)?)", re.IGNORECASE)

# Bones to draw, by BlazePose index. Kept to the joints the lifter analysis uses.
BONES = [
    (P.L_SH, P.R_SH), (P.L_HIP, P.R_HIP),
    (P.L_SH, P.L_HIP), (P.R_SH, P.R_HIP),
    (P.L_SH, P.L_EL), (P.L_EL, P.L_WR),
    (P.R_SH, P.R_EL), (P.R_EL, P.R_WR),
    (P.L_HIP, P.L_KN), (P.L_KN, P.L_AN),
    (P.R_HIP, P.R_KN), (P.R_KN, P.R_AN),
]
VIS_MIN = 0.2  # draw a joint/bone only if MediaPipe was at least this sure

PANEL_H = 520          # each frame panel is resized to this height
HEADER_H = 132         # top text band


def ground_truth_rpe(name: str) -> float | None:
    # "135 lb bench RPE RPE 6.5.mp4" doubles the token — take the LAST match.
    matches = GT_RE.findall(name)
    return float(matches[-1]) if matches else None


def read_strided_frames(path: str, stride: int, n: int) -> list[np.ndarray]:
    """Re-read the clip at the SAME stride pose.py used, so frame index f here
    lines up with row f of the pose track."""
    cap = cv2.VideoCapture(path)
    frames: list[np.ndarray] = []
    idx = 0
    while len(frames) < n:
        ok, fr = cap.read()
        if not ok:
            break
        if idx % stride == 0:
            frames.append(fr)
        idx += 1
    cap.release()
    return frames


def draw_skeleton(img, xy_f, vis_f, w, h, color=(0, 220, 120)) -> None:
    def px(j):
        return int(xy_f[j, 0] * w), int(xy_f[j, 1] * h)

    for a, b in BONES:
        if vis_f[a] >= VIS_MIN and vis_f[b] >= VIS_MIN:
            cv2.line(img, px(a), px(b), color, 3, cv2.LINE_AA)
    for j in P.KEYPOINTS:
        if vis_f[j] >= VIS_MIN:
            cv2.circle(img, px(j), 5, (0, 255, 255), -1, cv2.LINE_AA)


def selected_bbox(xy, vis, w, h):
    """Pixel bbox of the selected lifter over all detected frames — the single
    clearest 'is the skeleton on the right body' signal."""
    real = np.where(vis[:, P.KEYPOINTS].sum(axis=1) > 0)[0]
    if len(real) < 2:
        return None
    pts = xy[np.ix_(real, P.KEYPOINTS)]
    xs, ys = pts[..., 0], pts[..., 1]
    x0 = int(max(0.0, np.percentile(xs, 2)) * w)
    x1 = int(min(1.0, np.percentile(xs, 98)) * w)
    y0 = int(max(0.0, np.percentile(ys, 2)) * h)
    y1 = int(min(1.0, np.percentile(ys, 98)) * h)
    return x0, y0, x1, y1


def wrist_path_px(pose: P.PoseTrack) -> tuple[np.ndarray, np.ndarray]:
    """Camera-side wrist (more-visible of L/R) per frame, in pixels, plus its
    visibility — this is the bench bar path."""
    w, h = pose.frame_size
    xy, vis = pose.xy, pose.vis
    use_l = vis[:, P.L_WR] >= vis[:, P.R_WR]
    wr = np.where(use_l[:, None], xy[:, P.L_WR, :], xy[:, P.R_WR, :])
    wrist_px = np.column_stack([wr[:, 0] * w, wr[:, 1] * h])
    wrist_vis = np.maximum(vis[:, P.L_WR], vis[:, P.R_WR])
    return wrist_px, wrist_vis


def fit_panel(img):
    h, w = img.shape[:2]
    scale = PANEL_H / h
    return cv2.resize(img, (max(1, int(w * scale)), PANEL_H), interpolation=cv2.INTER_AREA)


def render_overlay(pose: P.PoseTrack, bar, video_path: str, stride: int, out_png: str,
                   header_lines: list[str]) -> bool:
    n = pose.total_frames
    w, h = pose.frame_size
    frames = read_strided_frames(video_path, stride, n)
    if len(frames) < 3:
        return False
    n = min(n, len(frames))

    detected = np.where(pose.vis[:n, P.KEYPOINTS].sum(axis=1) > 0)[0]
    if len(detected) >= 3:
        picks = [detected[int(p * (len(detected) - 1))] for p in (0.12, 0.5, 0.88)]
    else:
        picks = [int(p * (n - 1)) for p in (0.12, 0.5, 0.88)]

    bbox = selected_bbox(pose.xy[:n], pose.vis[:n], w, h)

    # Full bar path: real plate track if it locked, else the wrist path.
    if getattr(bar, "found", False):
        path = bar.bar_px[:n].copy()
        path_label = "PLATE PATH"
    else:
        path, _ = wrist_path_px(pose)
        path = path[:n]
        path_label = "WRIST PATH (=bar)"

    panels = []
    for k, fi in enumerate(picks):
        img = frames[fi].copy()
        if bbox is not None:
            cv2.rectangle(img, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (255, 255, 0), 2)
            cv2.putText(img, "SELECTED", (bbox[0], max(20, bbox[1] - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2, cv2.LINE_AA)
        draw_skeleton(img, pose.xy[fi], pose.vis[fi], w, h)
        # Draw the whole path on the middle panel only (keeps the ends readable).
        if k == 1:
            pts = path[np.isfinite(path).all(axis=1)].astype(int)
            for i in range(1, len(pts)):
                cv2.line(img, tuple(pts[i - 1]), tuple(pts[i]), (40, 160, 255), 2, cv2.LINE_AA)
            if len(pts):
                cv2.circle(img, tuple(pts[0]), 8, (0, 255, 0), -1, cv2.LINE_AA)
                cv2.circle(img, tuple(pts[-1]), 8, (0, 0, 255), -1, cv2.LINE_AA)
            cv2.putText(img, path_label, (12, h - 16), cv2.FONT_HERSHEY_SIMPLEX,
                        0.8, (40, 160, 255), 2, cv2.LINE_AA)
        cv2.putText(img, f"frame {fi}/{n}", (12, 30), cv2.FONT_HERSHEY_SIMPLEX,
                    0.8, (255, 255, 255), 2, cv2.LINE_AA)
        panels.append(fit_panel(img))

    montage = cv2.hconcat(panels)
    band = np.zeros((HEADER_H, montage.shape[1], 3), dtype=np.uint8)
    for i, line in enumerate(header_lines):
        cv2.putText(band, line, (14, 28 + i * 30), cv2.FONT_HERSHEY_SIMPLEX,
                    0.7, (255, 255, 255), 2, cv2.LINE_AA)
    out = cv2.vconcat([band, montage])
    cv2.imwrite(out_png, out)
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=os.path.join(os.path.dirname(__file__), "..", "sample_videos"))
    ap.add_argument("--backend", choices=("yolo", "rtm", "mediapipe"), default="yolo")
    ap.add_argument("--lift", choices=("bench", "squat", "deadlift"), default="bench")
    ap.add_argument("--model", default="yolov8x-pose.pt", help="YOLO pose weights (yolo backend)")
    ap.add_argument("--out", default=None, help="output dir (default eval_<backend>[_<lift>])")
    ap.add_argument("--only", default=None, help="substring filter on filename")
    args = ap.parse_args()

    base = {"yolo": "eval_yolo", "rtm": "eval_rtm"}.get(args.backend, "eval_visual")
    if args.lift != "bench":
        base = f"{base}_{args.lift}"
    out_dir = args.out or os.path.join(os.path.dirname(__file__), base)

    from analysis import analyze_lift
    # Bench & deadlift: the hands grip the bar, so the wrist IS the bar — no
    # plate tracker. Only squat needs it (bar on the back, off the hands).
    if args.backend == "rtm":
        import pose_rtm
        from pose_rtm import track_pose
        ymodel = pose_rtm.make_model()
        track_bar = None
    elif args.backend == "yolo":
        from pose_yolo import track_pose
        from ultralytics import YOLO
        ymodel = YOLO(args.model)
        track_bar = None
    else:
        from pose import track_pose
        track_bar = None
        ymodel = None
    if args.lift == "squat":
        from bar import track_bar  # noqa: F811

    os.makedirs(out_dir, exist_ok=True)
    vids = sorted(
        f for f in os.listdir(args.dir)
        if f.lower().endswith((".mp4", ".mov", ".m4v", ".avi"))
        and (args.only is None or args.only.lower() in f.lower())
    )
    if not vids:
        print(f"no videos in {args.dir}")
        return 1

    rows = []
    for name in vids:
        path = os.path.join(args.dir, name)
        gt = ground_truth_rpe(name)
        try:
            t0 = time.time()
            track = (track_pose(path, lift=args.lift, model=ymodel)
                     if args.backend in ("yolo", "rtm")
                     else track_pose(path, lift=args.lift))
            t_pose = time.time() - t0

            if track_bar is not None:
                t0 = time.time()
                bar = track_bar(path, track)
                t_bar = time.time() - t0
            else:
                bar, t_bar = None, 0.0  # bench wrist path; no plate tracker

            t0 = time.time()
            result = analyze_lift(
                track, lift=args.lift,
                bar_px=bar.bar_px if (bar and bar.found) else None,
                plate_r=bar.radius_px if (bar and bar.found) else 0.0,
            )
            t_an = time.time() - t0

            s = result["summary"]
            row = {
                "file": name, "gtRPE": gt,
                "rpe": s.get("rpe"), "reps": s.get("repCount"),
                "coverage": result["pose"]["coverage"], "quality": result["pose"]["quality"],
                "barSource": result.get("barSource"), "found": bool(bar.found) if bar else False,
                "poseSec": round(t_pose, 1), "barSec": round(t_bar, 1),
                "anSec": round(t_an, 1), "totalSec": round(t_pose + t_bar + t_an, 1),
                "frames": track.total_frames, "fps": round(track.fps, 1),
            }
            header = [
                f"{name}   [{args.backend}/{args.lift}]",
                f"GT RPE={gt}   computed RPE={row['rpe']}   reps={row['reps']}   "
                f"cov={row['coverage']:.0%} ({row['quality']})",
                f"bar={row['barSource']} (plate_found={row['found']})   "
                f"frames={row['frames']}@{row['fps']}fps   "
                f"latency: pose={row['poseSec']}s bar={row['barSec']}s tot={row['totalSec']}s",
            ]
            safe = re.sub(r"[^A-Za-z0-9._-]+", "_", name) + ".overlay.png"
            ok = render_overlay(track, bar, path, track.stride, os.path.join(out_dir, safe), header)
            row["overlay"] = safe if ok else None
            rows.append(row)
            print(f"  done: {name}  ({row['totalSec']}s, cov {row['coverage']:.0%})")
        except Exception as e:  # noqa: BLE001
            rows.append({"file": name, "gtRPE": gt, "error": f"{type(e).__name__}: {e}"})
            traceback.print_exc()

    with open(os.path.join(out_dir, "summary.json"), "w") as fh:
        json.dump(rows, fh, indent=2)

    print("\n" + "=" * 108)
    print(f'{"file":<32}{"GT":>5}{"RPE":>5}{"reps":>5}{"cov":>6}{"qual":>6}{"bar":>7}'
          f'{"pose_s":>8}{"tot_s":>7}')
    print("-" * 108)
    for r in rows:
        if "error" in r:
            print(f'{r["file"][:31]:<32}{str(r["gtRPE"]):>5}  ERROR {r["error"][:55]}')
            continue
        print(f'{r["file"][:31]:<32}{str(r["gtRPE"]):>5}{str(r["rpe"]):>5}{str(r["reps"]):>5}'
              f'{r["coverage"]:>6.0%}{r["quality"]:>6}{r["barSource"]:>7}'
              f'{r["poseSec"]:>8}{r["totalSec"]:>7}')
    print("=" * 108)
    print(f"overlays + summary.json in {out_dir}")
    print("Now LOOK at each overlay and fill in: correct-person y/n, bar-path-on-bar y/n.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
