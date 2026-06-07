"""De-risk probe: does YOLOv8-pose detect the LYING lifter where MediaPipe
couldn't? This answers the single biggest rebuild risk BEFORE we invest in
ByteTrack tracking, rep detection, or RPE.

For each clip it samples 3 frames (start / mid / end), runs YOLOv8-pose, and
draws every detected person's COCO skeleton + box + confidence. Then we LOOK:
is there a skeleton on the person lying on the bench, through the whole clip?

COCO-17 keypoints include both wrists, elbows, shoulders, hips, knees, ankles
— everything the bench analysis needs (wrist = bar, elbow flare, leg drive).

Usage:
    .venv/Scripts/python.exe yolo_probe.py [--model yolov8x-pose.pt] [--only 150]
"""

from __future__ import annotations

import argparse
import glob
import os
import time

import cv2
import numpy as np


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=os.path.join(os.path.dirname(__file__), "..", "sample_videos"))
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "yolo_probe"))
    ap.add_argument("--model", default="yolov8x-pose.pt")
    ap.add_argument("--only", default=None)
    args = ap.parse_args()

    from ultralytics import YOLO

    os.makedirs(args.out, exist_ok=True)
    model = YOLO(args.model)

    clips = sorted(
        p for p in glob.glob(os.path.join(args.dir, "*.mp4"))
        if args.only is None or args.only.lower() in os.path.basename(p).lower()
    )
    if not clips:
        print(f"no clips in {args.dir}")
        return 1

    for path in clips:
        name = os.path.basename(path)
        cap = cv2.VideoCapture(path)
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
        idxs = [int(total * p) for p in (0.2, 0.5, 0.8)] if total else [0, 1, 2]
        panels, infos = [], []
        for fi in idxs:
            cap.set(cv2.CAP_PROP_POS_FRAMES, fi)
            ok, fr = cap.read()
            if not ok:
                continue
            t0 = time.time()
            res = model(fr, verbose=False)[0]
            dt = time.time() - t0
            n_people = 0 if res.boxes is None else len(res.boxes)
            ann = res.plot(boxes=True, kpt_line=True, kpt_radius=6)
            h, w = ann.shape[:2]
            ann = cv2.resize(ann, (max(1, int(w * 520 / h)), 520))
            cv2.putText(ann, f"f{fi} people={n_people} {dt*1000:.0f}ms",
                        (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2, cv2.LINE_AA)
            panels.append(ann)
            infos.append((n_people, dt))
        cap.release()
        if not panels:
            print(f"  {name}: no frames read")
            continue
        montage = cv2.hconcat(panels)
        band = np.zeros((46, montage.shape[1], 3), dtype=np.uint8)
        avg_ms = 1000 * np.mean([d for _, d in infos])
        cv2.putText(band, f"{name}   model={args.model}   avg {avg_ms:.0f} ms/frame (CPU)",
                    (12, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)
        out = cv2.vconcat([band, montage])
        out_png = os.path.join(args.out, name + ".png")
        cv2.imwrite(out_png, out)
        print(f"  {name}: people/frame={[n for n,_ in infos]}  avg {avg_ms:.0f} ms/frame -> {out_png}")

    print(f"\nLOOK at {args.out}/*.png — is there a skeleton on the LYING lifter in every clip?")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
