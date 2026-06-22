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

In production the **browser** uploads straight to Modal (this dodges Vercel's
4.5 MB body limit and 60s timeout), so the client reads a **`NEXT_PUBLIC_`-
prefixed**, build-time variable. In Vercel:

1. Project -> Settings -> Environment Variables
2. Add `NEXT_PUBLIC_CV_SERVICE_URL` = the Modal URL above — `https`, **no
   trailing slash** — for Production (and Preview if you want it there too)
3. **Redeploy** the site. `NEXT_PUBLIC_` vars are inlined at *build* time, so a
   value added without a fresh build does nothing.

That's it — the browser's `/analyze` call now goes to Modal.

> The server-side `CV_SERVICE_URL` (read by `src/lib/cvService.ts`) is only the
> local-dev fallback, used when an API route calls the CV service itself. The
> deployed browser path does **not** use it — don't confuse the two.

## Notes

- `min_containers` in `modal_app.py` controls always-on warming. Set to `1`
  it keeps a container alive 24/7 so the first request after idle skips the
  cold start — but with `cpu=4.0` + `memory=8192` that reservation is billed
  the whole time, ~$0.25/hour (~$6/day) **even with zero traffic**. It's set
  to `0` so idle costs nothing; raise it to `1` only when steady traffic
  justifies paying for always-on.
- `@modal.concurrent(max_inputs=4)` lets one container handle 4 uploads
  in parallel. Bump `cpu`/`memory` together if you raise it.
- The rtmlib ONNX weights (~200 MB) are baked into the image at build
  time via `run_function(_prewarm_rtmlib)`, so cold starts don't re-fetch
  them.
- `requirements.txt` still lists mediapipe but the active path
  (`pose_rtm.py`) uses rtmlib + onnxruntime — `modal_app.py` installs the
  rtmlib stack, not mediapipe.
