"""Dump the FULL analysis JSON (formNotes, barPathNote, per-rep metrics) for
each research clip — visual_eval.py only saves topline numbers, but grading
the pipeline's advice against the r/formcheck comments needs the actual advice
text.

PoseTrack is pickled to pose_cache/ so analysis.py can be iterated on without
re-running 10+ minutes of CPU inference per clip. Cache key = filename + lift
+ backend, matching debug_dl_seg.py's convention.

Usage:
    .venv/Scripts/python.exe research/advice_dump.py [--only substr]
"""

from __future__ import annotations

import argparse
import json
import os
import pickle
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
SVC = os.path.dirname(HERE)
sys.path.insert(0, SVC)

CLIPS = os.path.join(HERE, "clips")
CACHE = os.path.join(SVC, "pose_cache")
OUT = os.path.join(HERE, "advice")

LIFT_OF = {"bench": "bench", "squat": "squat", "deadlift": "deadlift"}


def lift_for(name: str) -> str:
    for k in LIFT_OF:
        if name.startswith(k):
            return k
    return "bench"


def cached_track(path: str, lift: str, model, backend: str = "yolo"):
    import pose_rtm
    import pose_yolo

    key = os.path.basename(path) + f".{lift}.{backend}.pkl"
    pkl = os.path.join(CACHE, key)
    if os.path.exists(pkl):
        with open(pkl, "rb") as f:
            return pickle.load(f), True
    mod = pose_rtm if backend == "rtm" else pose_yolo
    track = mod.track_pose(path, lift=lift, model=model)
    os.makedirs(CACHE, exist_ok=True)
    with open(pkl, "wb") as f:
        pickle.dump(track, f)
    return track, False


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default=None)
    ap.add_argument("--dir", default=CLIPS)
    ap.add_argument("--backend", choices=("yolo", "rtm"), default="yolo")
    args = ap.parse_args()

    from analysis import analyze_lift
    from bar import track_bar

    if args.backend == "rtm":
        import pose_rtm
        model = pose_rtm.make_model()
    else:
        from ultralytics import YOLO
        model = YOLO(os.path.join(SVC, "yolov8x-pose.pt"))
    os.makedirs(OUT, exist_ok=True)

    vids = sorted(
        f for f in os.listdir(args.dir)
        if f.lower().endswith((".mp4", ".mov", ".m4v"))
        and (args.only is None or args.only.lower() in f.lower())
    )
    for name in vids:
        out_json = os.path.join(OUT, name + (".rtm" if args.backend == "rtm" else "") + ".json")
        if os.path.exists(out_json):
            print(f"skip (done): {name}")
            continue
        lift = lift_for(name)
        path = os.path.join(args.dir, name)
        t0 = time.time()
        try:
            track, hit = cached_track(path, lift, model, backend=args.backend)
            if lift == "squat":
                bar = track_bar(path, track)
                bar_px = bar.bar_px if bar.found else None
                plate_r = bar.radius_px if bar.found else 0.0
            else:
                bar_px, plate_r = None, 0.0
            result = analyze_lift(track, lift=lift, bar_px=bar_px, plate_r=plate_r)
            result.pop("overlayPng", None)   # keep the JSON readable
            result.pop("path", None)
            with open(out_json, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2)
            s = result["summary"]
            print(f"done: {name} [{lift}] cache={'hit' if hit else 'miss'} "
                  f"{time.time()-t0:.0f}s reps={s.get('repCount')} rpe={s.get('rpe')} "
                  f"cov={result['pose']['coverage']:.0%}")
            for note in s.get("formNotes", []):
                print(f"    - {note}")
        except Exception as e:  # noqa: BLE001
            with open(out_json, "w", encoding="utf-8") as f:
                json.dump({"error": f"{type(e).__name__}: {e}"}, f, indent=2)
            print(f"ERROR: {name}: {e}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
