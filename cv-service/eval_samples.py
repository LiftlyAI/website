"""Evaluation harness: run the full bench pipeline on every labeled sample
clip and score it against the RPE in the filename.

Ground truth lives in the filename, e.g. "150 kg bench RPE 9.mp4" -> RPE 9.

Usage:
    .venv/Scripts/python.exe eval_samples.py [--dir ../sample_videos] [--save-overlays]

It prints a per-clip table (pose coverage, person sanity, rep count, computed
RPE vs label, bar source/found) and writes overlay PNGs to eval_out/ so the
selected lifter + bar path can be inspected by eye.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import time
import traceback

GT_RE = re.compile(r"rpe\s*(\d+(?:\.\d+)?)", re.IGNORECASE)


def ground_truth_rpe(name: str) -> float | None:
    # "135 lb bench RPE RPE 6.5.mp4" has a doubled token — take the LAST match.
    matches = GT_RE.findall(name)
    return float(matches[-1]) if matches else None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=os.path.join(os.path.dirname(__file__), "..", "sample_videos"))
    ap.add_argument("--save-overlays", action="store_true", default=True)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "eval_out"))
    ap.add_argument("--only", default=None, help="substring filter on filename")
    args = ap.parse_args()

    # Import here so import errors surface with a clear message.
    from analysis import analyze_lift
    from bar import track_bar
    from pose import track_pose

    os.makedirs(args.out, exist_ok=True)
    vids = sorted(
        f for f in os.listdir(args.dir)
        if f.lower().endswith((".mp4", ".mov", ".m4v", ".avi"))
        and (args.only is None or args.only.lower() in f.lower())
    )
    if not vids:
        print(f"no videos in {args.dir}")
        return 1

    rows = []
    errs = 0
    for name in vids:
        path = os.path.join(args.dir, name)
        gt = ground_truth_rpe(name)
        t0 = time.time()
        try:
            track = track_pose(path, lift="bench")
            bar = track_bar(path, track)
            result = analyze_lift(
                track, lift="bench",
                bar_px=bar.bar_px if bar.found else None,
                plate_r=bar.radius_px if bar.found else 0.0,
            )
            s = result["summary"]
            row = {
                "file": name,
                "gtRPE": gt,
                "rpe": s.get("rpe"),
                "reps": s.get("repCount"),
                "velLoss": s.get("velocityLossPct"),
                "barSource": result.get("barSource"),
                "barFound": bool(bar.found),
                "barConf": round(float(bar.conf), 2),
                "coverage": result["pose"]["coverage"],
                "quality": result["pose"]["quality"],
                "fps": result["fps"],
                "frames": result["pose"]["totalFrames"],
                "secs": round(time.time() - t0, 1),
                "concentrics": [r["concentricS"] for r in result["reps"]],
            }
            if args.save_overlays and result.get("overlayPng"):
                png = base64.b64decode(result["overlayPng"])
                safe = re.sub(r"[^A-Za-z0-9._-]+", "_", name)
                with open(os.path.join(args.out, safe + ".overlay.png"), "wb") as fh:
                    fh.write(png)
            # full json for deep inspection
            safe = re.sub(r"[^A-Za-z0-9._-]+", "_", name)
            with open(os.path.join(args.out, safe + ".json"), "w") as fh:
                dump = {k: v for k, v in result.items() if k != "overlayPng"}
                json.dump(dump, fh, indent=2)
            rows.append(row)
        except Exception as e:  # noqa: BLE001
            errs += 1
            rows.append({"file": name, "gtRPE": gt, "error": f"{type(e).__name__}: {e}"})
            traceback.print_exc()

    print("\n" + "=" * 100)
    hdr = f'{"file":<34}{"gtRPE":>6}{"rpe":>5}{"reps":>5}{"vLoss":>7}{"bar":>8}{"cov":>6}{"qual":>6}{"sec":>6}'
    print(hdr)
    print("-" * 100)
    for r in rows:
        if "error" in r:
            print(f'{r["file"][:33]:<34}{str(r["gtRPE"]):>6}  ERROR {r["error"][:60]}')
            continue
        bar = ("plate" if r["barFound"] else "wrist")
        print(
            f'{r["file"][:33]:<34}'
            f'{str(r["gtRPE"]):>6}'
            f'{str(r["rpe"]):>5}'
            f'{str(r["reps"]):>5}'
            f'{str(r["velLoss"]):>7}'
            f'{bar:>8}'
            f'{r["coverage"]:>6}'
            f'{r["quality"]:>6}'
            f'{r["secs"]:>6}'
        )
    print("=" * 100)
    print(f"{len(rows)} clips, {errs} errors. Overlays + JSON in {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
