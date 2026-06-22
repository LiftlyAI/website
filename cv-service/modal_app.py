"""Modal deployment of the IRON LEDGER CV sidecar.

Wraps the existing FastAPI `app:app` (rtmlib + onnxruntime, CPU) as a Modal
ASGI app so the Vercel site can hit it 24/7 instead of needing
`uvicorn app:app` running locally.

Deploy:
    pip install modal
    modal token new                  # one-time
    cd cv-service
    modal deploy modal_app.py

That prints an HTTPS URL — set it as CV_SERVICE_URL in Vercel
(Project -> Settings -> Environment Variables) and redeploy the site.
"""

from __future__ import annotations

import modal

APP_NAME = "iron-ledger-cv"

# Pinned to match cv-service/requirements.txt, plus the rtmlib/onnxruntime
# stack pose_rtm.py actually uses (requirements.txt is stale — it still lists
# mediapipe, which the active code path no longer imports).
PY_DEPS = [
    "fastapi==0.115.5",
    "python-multipart==0.0.17",
    "numpy==2.1.3",
    "scipy==1.14.1",
    "opencv-python-headless==4.10.0.84",
    "rtmlib==0.0.13",
    "onnxruntime==1.20.1",
    "tqdm",
]


def _prewarm_rtmlib() -> None:
    """Run at image-build time so the ONNX weights (~200 MB) are baked in.
    Without this every cold start re-downloads them from the rtmlib hub."""
    from rtmlib import Body, PoseTracker

    for mode in ("balanced", "performance"):
        PoseTracker(
            Body,
            det_frequency=4,
            mode=mode,
            backend="onnxruntime",
            device="cpu",
            tracking=False,
        )


image = (
    modal.Image.debian_slim(python_version="3.11")
    # libgl1 + libglib2.0-0 are what opencv-python-headless needs at runtime
    # on debian-slim; ffmpeg lets cv2.VideoCapture decode phone clips
    # (mp4/mov/hevc) instead of failing on missing codecs.
    .apt_install("libgl1", "libglib2.0-0", "ffmpeg")
    .pip_install(*PY_DEPS)
    .run_function(_prewarm_rtmlib)
    # Ship the sidecar's Python modules into the container. Run
    # `modal deploy modal_app.py` from inside cv-service/ so these resolve.
    .add_local_python_source(
        "app", "analysis", "pose", "pose_rtm", "pose_yolo", "bar",
    )
)

app = modal.App(APP_NAME, image=image)


@app.function(
    cpu=4.0,
    # Headroom over the 4 GB that OOM-killed the worker on full-res phone clips.
    # The real fix is downscaling frames on read (pose_yolo.FRAME_LONG_SIDE_CAP);
    # this is belt-and-suspenders. Safe to drop back to 4096 once that's proven.
    memory=8192,
    timeout=600,
    # Scale to zero when idle. min_containers=1 kept a 4-core/8GB container
    # alive 24/7 (~$6/day) even with no traffic. With this at 0 you only pay
    # while a clip is actually being analyzed; the first request after idle
    # eats a cold start (~10-30s; ONNX weights are baked into the image).
    # Set back to 1 only once there's steady traffic that justifies always-on.
    min_containers=0,
)
@modal.asgi_app()
def fastapi_app():
    from app import app as fastapi
    return fastapi
