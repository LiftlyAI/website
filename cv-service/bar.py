"""Track the actual barbell plate — not the wrist.

Why this exists: for a side / foot-of-bench view the wrists are occluded by
the bar, plates and rack at the top of every rep, and MediaPipe HALLUCINATES
wrist positions there (with high confidence), so a wrist-derived "bar path"
is a scribble. The plate itself is a large, high-contrast disc with stable
texture — perfect for a correlation tracker.

The earlier pure-Hough attempt failed because a gym is full of circular
plates. The fix: use the lifter's pose (already solved) to (a) confirm the
person and (b) constrain the plate search to a window around the hands, and
to tell the *working* plate (moves with the wrist) from a *rack* plate
(stationary). Then a CSRT tracker locks the plate's texture and follows it
precisely, kept on a short leash to the wrist so it can never run off to the
rack or the floor. Hough re-seeds the tracker if it slips.

If no reliable plate is found near the hands we report found=False and the
caller falls back to the wrist path (no worse than before).
"""

from __future__ import annotations

import cv2
import numpy as np

import pose as P


class BarTrack:
    def __init__(self, bar_px: np.ndarray, radius_px: float, found: bool, conf: float):
        self.bar_px = bar_px          # (n,2) plate-centre pixels
        self.radius_px = radius_px
        self.found = found
        self.conf = conf              # fraction of frames with a real detection


def _csrt():
    if hasattr(cv2, "TrackerCSRT_create"):
        return cv2.TrackerCSRT_create()
    return cv2.legacy.TrackerCSRT_create()


def _wrist_and_scale(pose: P.PoseTrack):
    """Per-frame camera-side wrist (more visible of L/R) and body scale."""
    w, h = pose.frame_size
    xy, vis = pose.xy, pose.vis
    use_l = vis[:, P.L_WR] >= vis[:, P.R_WR]
    wr = np.where(use_l[:, None], xy[:, P.L_WR, :], xy[:, P.R_WR, :])
    wrist_px = np.column_stack([wr[:, 0] * w, wr[:, 1] * h])
    wrist_vis = np.maximum(vis[:, P.L_WR], vis[:, P.R_WR])

    sh = (xy[:, P.L_SH, :] + xy[:, P.R_SH, :]) / 2.0
    hp = (xy[:, P.L_HIP, :] + xy[:, P.R_HIP, :]) / 2.0
    sh_px = np.column_stack([sh[:, 0] * w, sh[:, 1] * h])
    hp_px = np.column_stack([hp[:, 0] * w, hp[:, 1] * h])
    torso = float(np.median(np.linalg.norm(sh_px - hp_px, axis=1)))
    torso = torso if torso > 1 else 0.2 * h
    return wrist_px, wrist_vis, torso


def _hough_near(gray: np.ndarray, cx: float, cy: float, half: float, rmin: int, rmax: int):
    """Hough circles inside a window around (cx,cy); centres in full coords."""
    h, w = gray.shape
    x0, y0 = max(0, int(cx - half)), max(0, int(cy - half))
    x1, y1 = min(w, int(cx + half)), min(h, int(cy + half))
    if x1 - x0 < 8 or y1 - y0 < 8:
        return np.empty((0, 3))
    roi = cv2.medianBlur(gray[y0:y1, x0:x1], 5)
    c = cv2.HoughCircles(
        roi, cv2.HOUGH_GRADIENT, dp=1.2, minDist=max(20, rmin),
        param1=120, param2=38, minRadius=rmin, maxRadius=rmax,
    )
    if c is None:
        return np.empty((0, 3))
    c = c[0]
    c[:, 0] += x0
    c[:, 1] += y0
    return c


def track_bar(video_path: str, pose: P.PoseTrack) -> BarTrack:
    try:
        return _track_bar(video_path, pose)
    except Exception:
        n = pose.total_frames
        return BarTrack(np.full((n, 2), np.nan), 0.0, False, 0.0)


def _track_bar(video_path: str, pose: P.PoseTrack) -> BarTrack:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError("reopen failed")
    # Mirror the pose stride so bar[f] lines up with the pose's frame f.
    stride = getattr(pose, "stride", 1)
    frames: list[np.ndarray] = []
    idx = 0
    while len(frames) < pose.total_frames:
        ok, fr = cap.read()
        if not ok:
            break
        if idx % stride == 0:
            frames.append(fr)
        idx += 1
    cap.release()
    n = min(len(frames), pose.total_frames)
    if n < 6:
        raise RuntimeError("too short")
    frames = frames[:n]
    # CLAHE: dark commercial-gym footage has a low-contrast plate against a
    # busy background — local contrast equalisation makes the rim detectable.
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    gray = [clahe.apply(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)) for f in frames]

    wrist_px, wrist_vis, torso = _wrist_and_scale(pose)
    wrist_px = wrist_px[:n]

    # --- 1. find the working plate from well-detected anchor frames ---
    order = np.argsort(-wrist_vis[:n])
    anchors = sorted(int(i) for i in order[: min(20, n)] if wrist_vis[i] > 0.3)
    if len(anchors) < 4:
        anchors = list(range(0, n, max(1, n // 16)))

    HS = 1.2 * torso
    # A loaded plate's radius is a fraction of the torso length — bounding
    # this tightly stops Hough inventing a giant circle over the whole scene.
    rmin, rmax = max(6, int(0.18 * torso)), int(0.65 * torso)
    dets: list[tuple[int, float, float, float]] = []  # frame, cx, cy, r
    for f in anchors:
        wx, wy = wrist_px[f]
        circles = _hough_near(gray[f], wx, wy, HS, rmin, rmax)
        if not len(circles):
            continue
        # Radius is already plate-sized (rmin..rmax); take the one nearest
        # the hand — that's the working plate, not a rack plate further off.
        d = np.hypot(circles[:, 0] - wx, circles[:, 1] - wy)
        j = int(np.argmin(d))
        if d[j] <= HS:
            dets.append((f, float(circles[j, 0]), float(circles[j, 1]), float(circles[j, 2])))

    if len(dets) < 4:
        raise RuntimeError("no plate near the hands")

    da = np.array(dets)
    R = float(np.median(da[:, 3]))
    # working plate must move with the wrist; reject a stationary rack plate
    fy = da[:, 0].astype(int)
    cy = da[:, 2]
    wy = wrist_px[fy, 1]
    if np.std(wy) > 0.05 * torso and np.std(cy) < 0.25 * np.std(wy):
        raise RuntimeError("only a stationary (rack) plate found near the hands")
    offset = np.array(
        [np.median(da[:, 1] - wrist_px[fy, 0]), np.median(da[:, 2] - wrist_px[fy, 1])]
    )

    # seed where the detected radius best matches R and the wrist is visible
    seed_i = int(np.argmin(np.abs(da[:, 3] - R) / R - 0.0 + (1 - wrist_vis[fy])))
    sf = int(da[seed_i, 0])
    scx, scy = da[seed_i, 1], da[seed_i, 2]

    leash = max(2.0 * R, 0.6 * torso)
    bar = np.full((n, 2), np.nan)
    conf = np.zeros(n, dtype=bool)

    def run(rng):
        tr = _csrt()
        side = int(2.1 * R)
        tr.init(frames[sf], (int(scx - side / 2), int(scy - side / 2), side, side))
        bar[sf] = (scx, scy)
        conf[sf] = True
        for f in rng:
            pred = wrist_px[f] + offset
            ok, box = tr.update(frames[f])
            c = np.array([box[0] + box[2] / 2.0, box[1] + box[3] / 2.0]) if ok else None
            if c is not None and np.hypot(*(c - pred)) <= leash:
                bar[f] = c
                conf[f] = True
                continue
            # tracker slipped — try to re-detect the plate near the wrist
            circ = _hough_near(gray[f], pred[0], pred[1], 1.4 * R + 0.4 * torso, rmin, rmax)
            if len(circ):
                d = np.hypot(circ[:, 0] - pred[0], circ[:, 1] - pred[1])
                j = int(np.argmin(d))
                if d[j] <= leash and 0.55 * R <= circ[j, 2] <= 1.6 * R:
                    cx2, cy2 = float(circ[j, 0]), float(circ[j, 1])
                    bar[f] = (cx2, cy2)
                    conf[f] = True
                    tr = _csrt()
                    tr.init(
                        frames[f],
                        (int(cx2 - side / 2), int(cy2 - side / 2), side, side),
                    )
                    continue
            bar[f] = pred  # brief gap — predicted from wrist + learned offset

    run(range(sf + 1, n))            # forward
    run(range(sf - 1, -1, -1))       # backward (fresh tracker from the seed)

    # fill any remaining NaNs and median-despike (k=3: kill spikes, low lag)
    idx = np.arange(n)
    good = ~np.isnan(bar[:, 0])
    for c in (0, 1):
        bar[:, c] = np.interp(idx, idx[good], bar[good, c])
    k = 3
    pad = np.pad(bar, ((k // 2, k // 2), (0, 0)), mode="edge")
    bar = np.stack(
        [np.median(np.lib.stride_tricks.sliding_window_view(pad[:, c], k), axis=1)
         for c in (0, 1)],
        axis=1,
    )

    # Hard gate, evaluated ONLY on real detections (predicted-from-wrist
    # frames trivially correlate with the wrist and would fool this). The
    # real bar moves vertically WITH the hands AND has comparable ROM; a
    # stationary rack plate barely moves -> fall back to the wrist path.
    frac = float(conf.mean())
    m = conf & (wrist_vis[:n] > 0.4)
    found = False
    if m.sum() >= 8:
        sb, sw = float(np.std(bar[m, 1])), float(np.std(wrist_px[m, 1]))
        corr = (
            float(np.corrcoef(bar[m, 1], wrist_px[m, 1])[0, 1])
            if sb > 1e-3 and sw > 1e-3
            else 0.0
        )
        moves_with_lift = sb >= 0.35 * sw
        # Plate must be laterally close to the wrist. A pillarbox / rack edge
        # at x≈0 while the wrist is at x≈1000 fails this: ~5 torso offset.
        x_offset = abs(
            float(np.median(bar[m, 0])) - float(np.median(wrist_px[m, 0]))
        )
        x_near_wrist = x_offset <= 1.5 * torso
        found = (
            frac >= 0.35
            and corr >= 0.5
            and moves_with_lift
            and x_near_wrist
            and _smooth_enough(bar, R)
        )
    return BarTrack(bar, R, found, frac)


def _smooth_enough(bar: np.ndarray, R: float) -> bool:
    """A real plate moves slowly and continuously. A bad lock (CSRT bouncing
    between the plate, the rack and reflections) makes large frame-to-frame
    jumps — the "scribble". This rejects it so we fall back to the (now
    correctly-selected) lifter's wrist path instead of drawing garbage."""
    step = np.linalg.norm(np.diff(bar, axis=0), axis=1)
    if not len(step):
        return True
    rom_y = float(np.percentile(bar[:, 1], 95) - np.percentile(bar[:, 1], 5))
    med_step = float(np.median(step))
    p90_step = float(np.percentile(step, 90))
    return med_step <= 0.6 * R and p90_step <= max(1.3 * R, 0.45 * max(rom_y, 1.0))
