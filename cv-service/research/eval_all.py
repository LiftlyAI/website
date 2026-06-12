"""One-command regression eval for the 24-clip corpus.

Pose tracks are cached (pose_cache/<file>.<lift>.yolo.pkl — same key as
advice_dump.py), so after the first run a full regression pass over
analysis.py changes costs seconds, not hours. Scores each clip against
research/expectations.json and prints a scoreboard:

  PASS  = all expectation checks pass
  PART  = tracked but some checks fail
  FAIL  = lifter not locked / hard error

Holdout clips are scored but flagged — tune ONLY on non-holdout clips.

Usage:
  .venv/Scripts/python.exe research/eval_all.py [--only substr] [--holdout]
  [--json out.json]
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
ROOT = os.path.dirname(SVC)
sys.path.insert(0, SVC)

CACHE = os.path.join(SVC, "pose_cache")


def cached_track(path: str, lift: str, model_holder: dict, backend: str = "yolo"):
    import pose_rtm
    import pose_yolo

    key = os.path.basename(path) + f".{lift}.{backend}.pkl"
    pkl = os.path.join(CACHE, key)
    if os.path.exists(pkl):
        with open(pkl, "rb") as f:
            return pickle.load(f), True
    if model_holder.get("m") is None:
        if backend == "rtm":
            model_holder["m"] = pose_rtm.make_model()
        else:
            from ultralytics import YOLO
            model_holder["m"] = YOLO(os.path.join(SVC, "yolov8x-pose.pt"))
    mod = pose_rtm if backend == "rtm" else pose_yolo
    track = mod.track_pose(path, lift=lift, model=model_holder["m"])
    os.makedirs(CACHE, exist_ok=True)
    with open(pkl, "wb") as f:
        pickle.dump(track, f)
    return track, False


def check_clip(exp: dict, result: dict | None, err: str | None) -> tuple[str, list[str]]:
    """Return (PASS|PART|FAIL, list of failed checks)."""
    fails: list[str] = []
    if err is not None:
        # An honest refusal on a clip we EXPECT to be unreadable is a pass.
        if exp["produces_reps"] is False:
            return "PASS", [f"honest refusal: {err[:60]}"]
        return "FAIL", [f"error: {err[:80]}"]

    cov = result["pose"]["coverage"]
    s = result["summary"]
    reps = s.get("repCount") or 0
    if cov < exp["min_coverage"]:
        fails.append(f"coverage {cov:.0%} < {exp['min_coverage']:.0%}")
    if exp["produces_reps"] and reps < 1:
        fails.append("no reps segmented")
    if not exp["produces_reps"] and reps == 0:
        pass  # acceptable silence on an unreadable clip
    band = exp.get("rpe_band")
    if band and exp["produces_reps"]:
        rpe = s.get("rpe")
        lo, hi = band
        if rpe is None:
            fails.append("rpe null (banded fallback expected)")
        elif not (lo <= rpe <= hi):
            fails.append(f"rpe {rpe} outside [{lo},{hi}]")
    if exp.get("praise"):
        # A praise clip must not get fault-toned notes. Heuristic: fault notes
        # are the ones that don't end with "good." and aren't neutral reads.
        notes = s.get("formNotes", [])
        faulty = [n for n in notes if "good" not in n.lower() and "healthy" not in n.lower()
                  and "skipped" not in n.lower() and "side-on" not in n.lower()
                  and "straight up" not in n.lower() and "in line with" not in n.lower()
                  and "if you compete" not in n.lower()]
        if faulty:
            fails.append(f"invented fault(s) on praise clip: {faulty[0][:60]}...")
    status = "PASS" if not fails else ("PART" if cov >= 0.4 else "FAIL")
    return status, fails


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default=None)
    ap.add_argument("--holdout", action="store_true", help="include holdout clips")
    ap.add_argument("--backend", choices=("yolo", "rtm"), default="yolo")
    ap.add_argument("--json", default=None)
    args = ap.parse_args()

    from analysis import analyze_lift

    exps = json.load(open(os.path.join(HERE, "expectations.json"), encoding="utf-8"))["clips"]
    model_holder: dict = {}
    rows = []
    for exp in exps:
        name = exp["file"]
        if args.only and args.only.lower() not in name.lower():
            continue
        if exp["holdout"] and not args.holdout:
            rows.append({"file": name, "lift": exp["lift"], "status": "HOLD", "fails": []})
            continue
        path = os.path.join(ROOT, exp["dir"], name) if exp["dir"] == "sample_videos" \
            else os.path.join(SVC, "research", "clips", name)
        t0 = time.time()
        result, err = None, None
        try:
            track, hit = cached_track(path, exp["lift"], model_holder, backend=args.backend)
            # Squat: bar signal handled inside analyze_lift (shoulder-as-bar
            # lands in P2); plate tracker intentionally NOT run here — it is
            # the confirmed F7 defect and eval must reflect the wrist baseline.
            result = analyze_lift(track, lift=exp["lift"])
        except Exception as e:  # noqa: BLE001
            err = f"{type(e).__name__}: {e}"
        status, fails = check_clip(exp, result, err)
        rows.append({
            "file": name, "lift": exp["lift"], "status": status, "fails": fails,
            "coverage": None if result is None else result["pose"]["coverage"],
            "reps": None if result is None else result["summary"].get("repCount"),
            "rpe": None if result is None else result["summary"].get("rpe"),
            "sec": round(time.time() - t0, 1),
        })
        print(f"{status:<5} {name[:40]:<42} {rows[-1].get('coverage')} reps={rows[-1].get('reps')} "
              f"rpe={rows[-1].get('rpe')} {('; '.join(fails))[:70]}")

    counts = {}
    for r in rows:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    print("\nSCOREBOARD:", counts)
    out_json = args.json or os.path.join(HERE, f"scoreboard_{args.backend}.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump({"rows": rows, "counts": counts}, f, indent=2)
    return 0


if __name__ == "__main__":
    sys.exit(main())
