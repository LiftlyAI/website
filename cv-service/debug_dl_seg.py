"""Debug one clip's rep segmentation WITHOUT paying the ~9-min YOLO pose pass on
every iteration: the pose track is cached to a pickle the first time, then
reused. Runs analyze_lift with SEG_DEBUG=1 (prints why each candidate rep was
kept/rejected) and dumps the production overlay PNG so the fix is verified by eye.

    .venv/Scripts/python.exe debug_dl_seg.py --only 290 --lift deadlift
    # edit analysis.py, then re-run — instant (loads the cached pose):
    .venv/Scripts/python.exe debug_dl_seg.py --only 290 --lift deadlift
"""

from __future__ import annotations

import argparse
import base64
import os
import pickle
import sys

HERE = os.path.dirname(__file__)


def find_clip(d: str, only: str) -> str | None:
    for f in sorted(os.listdir(d)):
        if f.lower().endswith((".mp4", ".mov", ".m4v", ".avi")) and only.lower() in f.lower():
            return os.path.join(d, f)
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=os.path.join(HERE, "..", "sample_videos"))
    ap.add_argument("--only", default="290")
    ap.add_argument("--lift", default="deadlift")
    ap.add_argument("--model", default=os.path.join(HERE, "yolov8x-pose.pt"))
    ap.add_argument("--no-cache", action="store_true", help="force a fresh pose pass")
    args = ap.parse_args()

    clip = find_clip(args.dir, args.only)
    if not clip:
        print(f"no clip matching '{args.only}' in {args.dir}")
        return 1
    name = os.path.basename(clip)

    cache_dir = os.path.join(HERE, "pose_cache")
    os.makedirs(cache_dir, exist_ok=True)
    cache = os.path.join(cache_dir, f"{name}.{args.lift}.pkl")

    if os.path.exists(cache) and not args.no_cache:
        with open(cache, "rb") as fh:
            track = pickle.load(fh)
        print(f"loaded cached pose: {cache}  cov={track.coverage:.0%} n={track.total_frames}")
    else:
        import time

        from ultralytics import YOLO

        import pose_yolo

        t0 = time.time()
        model = YOLO(args.model)
        track = pose_yolo.track_pose(clip, lift=args.lift, model=model)
        with open(cache, "wb") as fh:
            pickle.dump(track, fh)
        print(f"pose done in {time.time() - t0:.0f}s cov={track.coverage:.0%} -> cached {cache}")

    os.environ["SEG_DEBUG"] = "1"
    from analysis import analyze_lift

    result = analyze_lift(track, lift=args.lift, bar_px=None, plate_r=0.0)
    s = result["summary"]
    print(
        f"\nRESULT: reps={s['repCount']} rpe={s.get('rpe')} "
        f"conf={s.get('rpeConfidence')} cov={result['pose']['coverage']:.0%}"
    )
    print("warnings:", result.get("warnings"))

    out_png = os.path.join(HERE, "eval_yolo_deadlift", f"{name}.DEBUG.overlay.png")
    os.makedirs(os.path.dirname(out_png), exist_ok=True)
    with open(out_png, "wb") as fh:
        fh.write(base64.b64decode(result["overlayPng"]))
    print("overlay ->", out_png)
    return 0


if __name__ == "__main__":
    sys.exit(main())
