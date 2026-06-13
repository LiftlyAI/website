"""IRON LEDGER bar-path CV sidecar.

Pose-based bench analysis: the wrist line is the bar (robust in a gym full
of circular plates), effort comes from rep-time slowdown (not absolute m/s),
and body angles feed real form coaching.

Run:  uvicorn app:app --host 127.0.0.1 --port 8000
"""

from __future__ import annotations

import os
import tempfile

import numpy as np
from fastapi import FastAPI, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import pose_rtm
from analysis import analyze_lift

app = FastAPI(title="IRON LEDGER CV", version="0.5.0", redirect_slashes=False)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_BYTES = 80 * 1024 * 1024
SUPPORTED_LIFTS = {"bench", "squat", "deadlift"}

# RTMPose-m (rtmlib, ONNX) replaces YOLOv8x-pose: 20-50x faster on CPU AND
# higher coverage on occluded/crowded clips (research/bakeoff.json). The ONNX
# sessions are created once on first request; pose_rtm escalates to the big
# model + crop re-pass automatically when the fast pass struggles.
_pose_model = None


def _get_pose_model():
    global _pose_model
    if _pose_model is None:
        _pose_model = pose_rtm.make_model()
    return _pose_model


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "iron-ledger-cv", "lifts": sorted(SUPPORTED_LIFTS)}


@app.post("/analyze")
async def analyze(video: UploadFile, lift: str = Form("bench")) -> JSONResponse:
    lift = lift.lower().strip()
    if lift not in SUPPORTED_LIFTS:
        raise HTTPException(
            status_code=422,
            detail=f"'{lift}' not supported yet — bench press only for now.",
        )

    data = await video.read()
    if not data:
        raise HTTPException(status_code=422, detail="empty upload")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="video too large (max 80 MB)")

    suffix = os.path.splitext(video.filename or "clip.mp4")[1] or ".mp4"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        tmp.write(data)
        tmp.close()
        track = pose_rtm.track_pose(tmp.name, lift=lift, model=_get_pose_model())
        # Bench & deadlift: the wrist line IS the bar. Squat: the bar rides on
        # the SHOULDERS, so the shoulder midpoint is the bar signal — the CSRT
        # plate tracker is retired (it locked stationary rack plates and
        # zeroed-out perfectly tracked sets; ANALYSIS.md F7).
        result = analyze_lift(track, lift=lift)
    except RuntimeError as e:
        # Expected, actionable failures (bad angle, no lifter, missing model).
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"analysis failed: {e}")
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass

    return JSONResponse(_json_safe({"ok": True, **result}))


def _json_safe(o):
    """NaN/inf are not valid JSON — recursively replace with None so a stray
    non-finite value can never 500 the endpoint. Also coerces numpy scalars."""
    import math

    if isinstance(o, dict):
        return {k: _json_safe(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_json_safe(v) for v in o]
    if isinstance(o, float):
        return o if math.isfinite(o) else None
    if isinstance(o, (np.floating,)):
        f = float(o)
        return f if math.isfinite(f) else None
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, np.ndarray):
        return _json_safe(o.tolist())
    return o
