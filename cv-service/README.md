# IRON LEDGER — Bar-Path CV Sidecar

A small local FastAPI service that analyses a bench-press clip with **body
pose estimation** (MediaPipe BlazePose). The lifter's wrist line *is* the
bar — far more robust than circle detection in a gym full of plates — and
the body keypoints drive real form coaching.

It returns the tracked bar path, per-rep concentric **time**, how much the
last reps slow vs the fastest (velocity loss), the J-curve read, joint
angles (elbow extension, elbow flare, wrist-over-elbow stack, hip/shoulder/
foot stability), and a research-based RPE/RIR that the app then calibrates
to the individual.

## Setup

```bash
cd cv-service
python -m venv .venv
.venv\Scripts\activate          # PowerShell: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python download_model.py        # one-time ~9 MB pose model → models/
uvicorn app:app --host 127.0.0.1 --port 8000
```

On Windows cmd.exe, run each line separately (cmd has no `;`), or call the
venv directly without activating:

```cmd
cd /d <repo>\cv-service
.venv\Scripts\python.exe download_model.py
.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000
```

After the one-time model download the service runs **fully offline**. In
the app's `.env.local`: `CV_SERVICE_URL=http://127.0.0.1:8000`.
`GET /health` returns `{"ok": true, ...}`.

## API

`POST /analyze` — multipart form:

| field   | type   | default | notes              |
|---------|--------|---------|--------------------|
| `video` | file   | —       | mp4/mov/webm ≤80MB |
| `lift`  | string | `bench` | bench only for now |

Returns JSON: `fps`, `pose` (coverage/quality), `path[]` (bar = wrist line,
body-relative), `reps[]` (descent/pause/**concentric** seconds, slowdown vs
fastest, curveRatio, elbow angles, flare, wrist-over-elbow), `summary`
(first/fastest/last concentric, `velocityLossPct`, `wallRepIndex`,
`rir`/`rpe`, `barPathNote`, stability, `formNotes[]`), and `overlayPng`
(skeleton + bar path drawn on a frame).

## Why these choices

- **Pose, not circles.** A rack has 8+ circular plates; "find the round
  thing" is unwinnable. The wrist line is the bar and is unambiguous, and
  the same model yields the joints needed for form coaching.
- **Time, not m/s.** Absolute velocity needs scale calibration the user
  rejected. Rep-to-rep slowdown (fastest → last) maps to reps-in-reserve
  via bench research and is scale-free.
- **Body-relative units.** Distances are in torso-lengths / % of ROM, so
  results survive any camera distance and never depend on plate size.

## Camera angle

Foot-of-bench or a clean side view, camera fixed, the lifter's **whole
body** in frame and well lit, for the full lift (unrack → re-rack). Low
pose coverage is reported as a warning.

## Files

- `pose.py` — MediaPipe PoseLandmarker (VIDEO mode) → per-frame joints.
- `analysis.py` — bar path, rep segmentation, slowdown, J-curve, form
  angles, RPE/RIR, overlay. Bench-specific; squat/deadlift reuse it.
- `app.py` — FastAPI; bench-only gate.
- `download_model.py` — one-time pose-model fetch.
