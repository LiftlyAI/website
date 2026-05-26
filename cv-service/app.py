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
from fastapi.responses import JSONResponse

from analysis import analyze_lift
from bar import track_bar
from pose import track_pose

app = FastAPI(title="IRON LEDGER CV", version="0.3.0")

MAX_BYTES = 80 * 1024 * 1024
SUPPORTED_LIFTS = {"bench", "squat", "deadlift"}


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
        track = track_pose(tmp.name, lift=lift)
        bar = track_bar(tmp.name, track)  # direct plate tracking (pose-constrained)
        result = analyze_lift(
            track,
            lift=lift,
            bar_px=bar.bar_px if bar.found else None,
            plate_r=bar.radius_px if bar.found else 0.0,
        )
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
