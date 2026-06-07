# Form-check rebuild — fresh session kickoff prompt

Paste this into a new session.

---

The bench-press form-check CV pipeline in `cv-service/` (MediaPipe BlazePose in `pose.py` + OpenCV Hough/CSRT plate tracking in `bar.py` + `analysis.py`) **does not work**. All 5 labeled clips in `sample_videos/` fail visually:

- `150 kg bench RPE 9` — skeleton tracks the standing **spotter**, not the lifter.
- `160 kg bench RPE 9` — near-zero pose coverage.
- `310 lb bench RPE 7`, `150lb bench RPE 6`, `135 lb bench RPE RPE 6.5` — bar path is a scribble / mis-placed.

**Do NOT trust `eval_samples.py`'s "RPE in band" output.** That proxy metric reported success for months while the overlays were broken. (See memory notes `formcheck-cv-pipeline` and `feedback-verify-visually`.)

## Goal (judged VISUALLY on all 5 clips)
1. Skeleton on the correct person — the lifter lying on the bench, never the spotter.
2. Bar path drawn ON the bar through the full lift.
3. Correct rep count.
4. RPE matching the label in the filename.

## First step — BEFORE any model change
Build a **visual eval harness**: for each clip render the overlay and report correct-person (y/n), bar-path-on-bar (y/n), rep-count vs expected, RPE vs label. Look at the overlays. This is the success criterion — not RPE-in-band.

## Early decision
Confirm the **deployment target** (local CPU / cloud CPU / GPU). It gates whether a YOLOv8-pose + ByteTrack rebuild is viable — measure CPU latency up front (MediaPipe is near-real-time; YOLO-CPU can be 3-8× slower). For bench, the wrist rigidly tracks the bar, so **do not build a plate detector**.

## Constraints
Prior sessions were very expensive. Work in small, verifiable steps. Confirm the visual result on the clips before declaring anything fixed.

Ground-truth RPE is in each filename in `sample_videos/`.
