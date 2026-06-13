# Deploying the CV sidecar to Modal

This replaces `uvicorn app:app --host 127.0.0.1 --port 8000` with an
always-on HTTPS endpoint the Vercel site can call.

## One-time setup

```powershell
# from cv-service/
pip install modal
modal token new
```

`modal token new` opens a browser to link your Modal account.

## Deploy

```powershell
cd cv-service
modal deploy modal_app.py
```

First deploy takes ~3-5 min (it builds the image and pre-downloads the
rtmlib ONNX weights so cold starts are fast). Later deploys are seconds.

Modal prints a URL like:

```
https://<your-username>--iron-ledger-cv-fastapi-app.modal.run
```

Quick check:

```powershell
curl https://<your-username>--iron-ledger-cv-fastapi-app.modal.run/health
# -> {"ok":true,"service":"iron-ledger-cv","lifts":["bench","deadlift","squat"]}
```

## Point Vercel at it

`src/lib/cvService.ts` reads `process.env.CV_SERVICE_URL` (defaulting to
`http://127.0.0.1:8000`). In Vercel:

1. Project -> Settings -> Environment Variables
2. Add `CV_SERVICE_URL` = the Modal URL above, for Production (and
   Preview if you want it there too)
3. Redeploy the site (or trigger a new deploy)

That's it — `/analyze` now goes to Modal.

## Notes

- `min_containers=1` in `modal_app.py` keeps one container always warm so
  the first request after idle doesn't pay a cold start. Costs ~a few
  cents/hour while idle. Drop it to `0` if you don't need always-on.
- `@modal.concurrent(max_inputs=4)` lets one container handle 4 uploads
  in parallel. Bump `cpu`/`memory` together if you raise it.
- The rtmlib ONNX weights (~200 MB) are baked into the image at build
  time via `run_function(_prewarm_rtmlib)`, so cold starts don't re-fetch
  them.
- `requirements.txt` still lists mediapipe but the active path
  (`pose_rtm.py`) uses rtmlib + onnxruntime — `modal_app.py` installs the
  rtmlib stack, not mediapipe.
