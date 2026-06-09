"""Per-frame body pose for a bench-press clip (MediaPipe BlazePose).

Why pose instead of circle detection: a gym is full of circular plates, so
"find the round thing" is unwinnable. But the bar is locked in the lifter's
hands — the wrist line *is* the bar. Tracking the body is far more robust and
it also yields the joint angles needed for real form coaching (elbow flare,
wrist-over-elbow stack, torso/arch, leg drive).

Three things make this hold up on real phone footage:

  1. ORIENTATION. BlazePose is trained on upright people and badly under-
     detects a lifter lying flat (a bench clip is exactly that). We probe
     {0, 90cw, 90ccw} on a handful of frames and run the whole clip at the
     rotation that makes the *lying* lifter most detectable, then map the
     landmarks back to original image coords.

  2. IMAGE mode, not VIDEO mode. VIDEO mode locks onto the most prominent
     person (often a standing spotter) and never re-surfaces the lifter.
     Fresh per-frame detection surfaces the lifter whenever it's visible;
     our own track-linking handles the temporal association.

  3. The lifter is the most HORIZONTAL substantial person — never a standing
     spotter. For bench we reject clearly-vertical tracks outright instead of
     falling back to one, so a spotter can't be analysed as the lifter. If no
     lying lifter is present often enough, we refuse with an actionable
     "reframe" message rather than returning garbage.

Output is body-relative and scale-free: positions are normalised image
coords, distances are later expressed in torso lengths / % of ROM, so we
never depend on plate-diameter calibration or a fixed camera distance.
"""

from __future__ import annotations

import os

# MediaPipe is chatty on stderr; quiet it before import.
os.environ.setdefault("GLOG_minloglevel", "2")
os.environ.setdefault("GLOG_logtostderr", "0")

import cv2
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "pose_landmarker_full.task")
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_full/float16/latest/pose_landmarker_full.task"
)

# BlazePose 33-landmark indices we care about.
L_SH, R_SH = 11, 12
L_EL, R_EL = 13, 14
L_WR, R_WR = 15, 16
L_HIP, R_HIP = 23, 24
L_KN, R_KN = 25, 26
L_AN, R_AN = 27, 28
KEYPOINTS = [L_SH, R_SH, L_EL, R_EL, L_WR, R_WR, L_HIP, R_HIP, L_KN, R_KN, L_AN, R_AN]

# Rotations we try so a lying lifter looks upright to BlazePose.
_ROTATIONS = {
    0: None,
    90: cv2.ROTATE_90_CLOCKWISE,
    270: cv2.ROTATE_90_COUNTERCLOCKWISE,
}


class PoseTrack:
    def __init__(
        self,
        xy: np.ndarray,  # (n_frames, 33, 2) normalised image coords
        vis: np.ndarray,  # (n_frames, 33) visibility 0..1
        fps: float,
        frame_size: tuple[int, int],
        sample_frame: np.ndarray,
        detected_frames: int,
        stride: int = 1,
    ):
        self.xy = xy
        self.vis = vis
        self.fps = fps          # EFFECTIVE fps after striding (matches xy rows)
        self.frame_size = frame_size
        self.sample_frame = sample_frame
        self.detected_frames = detected_frames
        self.stride = stride    # raw-frame stride, so bar.py can mirror it
        self.total_frames = xy.shape[0]

    @property
    def coverage(self) -> float:
        return self.detected_frames / max(1, self.total_frames)

    @property
    def quality(self) -> str:
        if self.coverage >= 0.85 and self.total_frames >= 20:
            return "good"
        if self.coverage >= 0.55:
            return "fair"
        return "low"


def _make_landmarker():
    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(
            "pose model missing — run cv-service/download_model.py "
            "(or curl the pose_landmarker_full.task into cv-service/models/)"
        )
    from mediapipe.tasks import python as mtp
    from mediapipe.tasks.python import vision

    # IMAGE mode (fresh per frame) + a low detection floor so the lifter, who
    # is often a lower-confidence detection than a standing bystander, still
    # surfaces. num_poses=5 because gyms have spotters / passers-by; the
    # selector below commits to the lifter.
    opts = vision.PoseLandmarkerOptions(
        base_options=mtp.BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=vision.RunningMode.IMAGE,
        num_poses=5,
        min_pose_detection_confidence=0.3,
        min_pose_presence_confidence=0.3,
        min_tracking_confidence=0.3,
    )
    return vision.PoseLandmarker.create_from_options(opts)


def _unrotate_xy(xy: np.ndarray, code) -> np.ndarray:
    """Map normalised landmark coords from a rotated frame back to the
    original orientation. xy is (...,2)."""
    if code is None:
        return xy
    x, y = xy[..., 0], xy[..., 1]
    if code == cv2.ROTATE_90_CLOCKWISE:            # original (xo,yo)->(1-yo, xo)
        ox, oy = y, 1.0 - x
    elif code == cv2.ROTATE_90_COUNTERCLOCKWISE:   # original ->(yo, 1-xo)
        ox, oy = 1.0 - y, x
    else:
        ox, oy = x, y
    return np.stack([ox, oy], axis=-1)


# Torso orientation cleanly separates the lifter from bystanders:
#  - bench: the LIFTER is horizontal (lying); a standing spotter is vertical.
#  - squat / deadlift: the LIFTER is upright; we don't gate as hard there
#    (mid-rep the torso can lean), but we still prefer an upright torso to
#    exclude anyone sitting/lying nearby.
HORIZ_LYING = 0.30       # bench: a track this horizontal (or more) is a lifter
HORIZ_UPRIGHT = 0.35     # squat: med_horiz must be BELOW this
# A conventional deadlift is HINGED — the torso is legitimately near-horizontal
# at the floor and only stands fully upright at lockout, so the median horiz over
# the pull sits much higher than a squat's. The squat gate (0.35) rejected the
# real puller and dropped coverage; allow a far more horizontal median for DL
# while still excluding a fully-lying (>0.62) bystander.
HORIZ_UPRIGHT_DL = 0.62
# A foreshortened (foot-of-bench) lifter looks vertical but their hands press
# AND they fill a real chunk of the frame. A standing spotter may wave their
# arms (wrist travel) but is small/off to the side, so we require BOTH.
WRIST_PRESS_MIN = 0.06   # min vertical wrist travel, fraction of frame height
LIFTER_AREA_MIN = 0.12   # min keypoint bbox area for the wrist-press path


def _candidate(xy: np.ndarray, vis: np.ndarray, aspect: float) -> dict:
    iso = xy.copy()
    iso[:, 0] *= aspect  # isotropic so the angle test is meaningful
    sh = (iso[L_SH] + iso[R_SH]) / 2.0
    hp = (iso[L_HIP] + iso[R_HIP]) / 2.0
    centroid = (sh + hp) / 2.0
    dx, dy = abs(hp[0] - sh[0]), abs(hp[1] - sh[1])
    horiz = dx / (dx + dy + 1e-6)  # ~1 lying flat, ~0 standing

    pts = iso[KEYPOINTS]
    area = float(
        (pts[:, 0].max() - pts[:, 0].min()) * (pts[:, 1].max() - pts[:, 1].min())
    )
    in_frame = float(
        np.mean(
            (xy[KEYPOINTS, 0] >= 0)
            & (xy[KEYPOINTS, 0] <= 1)
            & (xy[KEYPOINTS, 1] >= 0)
            & (xy[KEYPOINTS, 1] <= 1)
        )
    )
    mean_vis = float(np.mean(vis[KEYPOINTS]))
    # core (shoulder+hip) visibility — these define the torso angle, so a
    # candidate with a confident core is a far more reliable lifter signal
    # than one carried by stray limb points.
    core_vis = float(np.mean(vis[[L_SH, R_SH, L_HIP, R_HIP]]))
    score = 1.2 * min(area, 0.5) + 0.8 * in_frame + 0.5 * mean_vis
    return {
        "xy": xy,
        "vis": vis,
        "centroid": centroid,
        "area": max(area, 1e-4),
        "horiz": horiz,
        "mean_vis": mean_vis,
        "core_vis": core_vis,
        "score": score,
    }


def _cand_wrist_y(c: dict) -> float:
    """Normalised y of the more-visible wrist — used to measure how much a
    track's hands travel vertically (the press), which tells a foreshortened
    lifter apart from a standing spotter."""
    vis = c["vis"]
    wr = L_WR if vis[L_WR] >= vis[R_WR] else R_WR
    return float(c["xy"][wr, 1])


def _detect_in_region(landmarker, frame_bgr, code, aspect, mp, crop=None) -> list[dict]:
    """Detect poses, optionally inside a crop box (x0,y0,w,h) in original
    pixels that is upscaled first — a small/distant lifter gets far more
    pixels, which is the single biggest lever for coverage. Landmarks are
    always mapped back to ORIGINAL-frame normalised coords, so candidates are
    comparable across passes."""
    H, W = frame_bgr.shape[:2]
    if crop is None:
        sub = frame_bgr
        x0 = y0 = 0
        cw, ch = W, H
    else:
        x0, y0, cw, ch = crop
        sub = frame_bgr[y0:y0 + ch, x0:x0 + cw]
        if sub.size == 0:
            return []
        scale = 720.0 / max(1, max(cw, ch))   # upscale small crops, don't shrink big ones
        if scale > 1.05:
            sub = cv2.resize(sub, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)
    img = sub if code is None else cv2.rotate(sub, code)
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    res = landmarker.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
    cands: list[dict] = []
    if res.pose_landmarks:
        for lms in res.pose_landmarks:
            cxy = np.array([[lm.x, lm.y] for lm in lms], dtype=np.float64)
            cxy = _unrotate_xy(cxy, code)                     # -> [0,1] in crop space
            if crop is not None:                              # crop space -> original frame
                cxy[:, 0] = (x0 + cxy[:, 0] * cw) / W
                cxy[:, 1] = (y0 + cxy[:, 1] * ch) / H
            cvi = np.array([lm.visibility for lm in lms], dtype=np.float64)
            cands.append(_candidate(cxy, cvi, aspect))
    return cands


def _detect_candidates(landmarker, frame_bgr, code, aspect, mp) -> list[dict]:
    return _detect_in_region(landmarker, frame_bgr, code, aspect, mp, crop=None)


def _lifter_crop(xy: np.ndarray, vis: np.ndarray, w: int, h: int):
    """A stable pixel crop box (x0,y0,cw,ch) around the lifter, from the frames
    where they were really detected. The lifter is near-stationary on a bench,
    so one robust box covers the whole set; generous margins keep the pressed-
    out arms in frame."""
    real = np.where(vis[:, KEYPOINTS].sum(axis=1) > 0)[0]
    if len(real) < 4:
        return None
    pts = xy[np.ix_(real, KEYPOINTS)]            # (m, K, 2) normalised
    xs, ys = pts[..., 0], pts[..., 1]
    x0n, x1n = np.percentile(xs, 2), np.percentile(xs, 98)
    y0n, y1n = np.percentile(ys, 2), np.percentile(ys, 98)
    mx, my = 0.25 * (x1n - x0n) + 0.04, 0.25 * (y1n - y0n) + 0.04
    x0 = int(max(0.0, x0n - mx) * w)
    y0 = int(max(0.0, y0n - my) * h)
    x1 = int(min(1.0, x1n + mx) * w)
    y1 = int(min(1.0, y1n + my) * h)
    cw, ch = x1 - x0, y1 - y0
    if cw < 24 or ch < 24:
        return None
    # No point cropping if it barely shrinks the frame.
    if cw * ch > 0.82 * w * h:
        return None
    return (x0, y0, cw, ch)


def _lifter_likeness(c: dict, lift: str) -> float:
    """How much a single detection looks like the working lifter for `lift`.
    Used only to pick the camera orientation, so it just has to rank
    orientations, not be calibrated."""
    if lift == "bench":
        orient = max(0.0, c["horiz"] - 0.15)        # reward horizontal
    else:
        orient = max(0.0, 0.85 - c["horiz"])        # reward upright
    return orient * (0.4 + c["core_vis"]) * (0.3 + min(c["area"], 0.4))


def _best_rotation(frames, landmarker, aspect, lift, mp) -> int:
    """Probe a sample of frames at each rotation; keep the one where the
    lifter (lying for bench, upright otherwise) is most detectable. Only
    meaningful for bench — squat/DL are filmed upright, so we leave them at 0."""
    if lift != "bench" or len(frames) < 8:
        return 0
    n = len(frames)
    idxs = np.linspace(0, n - 1, min(18, n)).astype(int)
    best_code, best_score = 0, -1.0
    for deg, code in _ROTATIONS.items():
        s = 0.0
        for i in idxs:
            cands = _detect_candidates(landmarker, frames[i], code, aspect, mp)
            if cands:
                s += max(_lifter_likeness(c, lift) for c in cands)
        if s > best_score:
            best_score, best_code = s, deg
    return best_code


def select_lifter_track(
    per_frame: list[list[dict]], fps: float, lift: str = "bench"
) -> tuple[np.ndarray, np.ndarray, int]:
    """Link detections into per-person tracks, then commit to the lifter:
    LYING DOWN for bench (rejects upright spotters), UPRIGHT for squat /
    deadlift. Pure / no MediaPipe so it is unit-testable.

    For bench we never fall back to a vertical track — a standing spotter must
    never be analysed as the lifter. If no sufficiently-present lying lifter
    exists we raise an actionable error."""
    n = len(per_frame)
    if n < 6:
        raise RuntimeError("clip too short or unreadable (need >= 6 frames)")

    max_gap = max(3, int(fps * 0.7))
    tracks: list[dict] = []
    for f, cands in enumerate(per_frame):
        if not cands:
            continue
        active = [tr for tr in tracks if f - tr["last_idx"] <= max_gap]
        pairs = []
        for ti, tr in enumerate(active):
            gap = f - tr["last_idx"]
            gate = 0.12 * (1 + gap)
            for ci, c in enumerate(cands):
                d = float(np.hypot(*(c["centroid"] - tr["centroid"])))
                ratio = c["area"] / tr["area"]
                if d <= gate and 0.35 <= ratio <= 2.8:
                    pairs.append((d, ti, ci))
        pairs.sort(key=lambda p: p[0])
        used_t: set[int] = set()
        used_c: set[int] = set()
        for _, ti, ci in pairs:
            if ti in used_t or ci in used_c:
                continue
            tr, c = active[ti], cands[ci]
            tr["centroid"] = c["centroid"]
            tr["area"] = c["area"]
            tr["last_idx"] = f
            tr["score_sum"] += c["score"]
            tr["vis_sum"] += c["mean_vis"]
            tr["horiz"].append(c["horiz"])
            tr["wrist_y"].append(_cand_wrist_y(c))
            tr["count"] += 1
            tr["frames"][f] = c
            used_t.add(ti)
            used_c.add(ci)
        for ci, c in enumerate(cands):
            if ci in used_c:
                continue
            tracks.append(
                {
                    "last_idx": f,
                    "centroid": c["centroid"],
                    "area": c["area"],
                    "score_sum": c["score"],
                    "vis_sum": c["mean_vis"],
                    "horiz": [c["horiz"]],
                    "wrist_y": [_cand_wrist_y(c)],
                    "count": 1,
                    "frames": {f: c},
                }
            )

    no_lifter = (
        "couldn't find the lifter on the bench — make sure the person LYING "
        "on the bench is fully in frame and well lit, filmed from the side or "
        "foot of the bench (a standing spotter is ignored on purpose)"
    )
    if not tracks:
        raise RuntimeError(no_lifter)

    for tr in tracks:
        tr["med_horiz"] = float(np.median(tr["horiz"]))
        tr["presence"] = tr["count"] / n
        tr["mean_score"] = tr["score_sum"] / tr["count"]
        tr["mean_vis"] = tr["vis_sum"] / tr["count"]
        wy = np.array(tr["wrist_y"])
        tr["wrist_range"] = (
            float(np.percentile(wy, 90) - np.percentile(wy, 10)) if len(wy) >= 4 else 0.0
        )
        # Bench presser's wrists ride ABOVE the shoulders (smaller image y) for
        # much of the lift; a seated/standing spotter's never do. This is the
        # signal that separates the lifter from bystanders in a crowded gym.
        press = []
        for c in tr["frames"].values():
            wyf = (c["xy"][L_WR, 1] + c["xy"][R_WR, 1]) / 2.0
            syf = (c["xy"][L_SH, 1] + c["xy"][R_SH, 1]) / 2.0
            press.append(1.0 if wyf < syf else 0.0)
        tr["press_frac"] = float(np.mean(press)) if press else 0.0

    if os.environ.get("POSE_DEBUG"):
        for ti, tr in enumerate(sorted(tracks, key=lambda t: -t["presence"])[:6]):
            print(
                f"  track{ti}: n={tr['count']:4d} pres={tr['presence']:.2f} "
                f"horiz={tr['med_horiz']:.2f} vis={tr['mean_vis']:.2f} "
                f"area={tr['area']:.3f} wristRange={tr['wrist_range']:.3f}"
            )

    if lift == "bench":
        # The lifter is either clearly LYING (side view -> high horiz) or a
        # foreshortened lifter whose HANDS PRESS (large vertical wrist travel).
        # A standing spotter is neither (vertical AND still), so this rejects
        # them without a vertical fallback. If nobody qualifies, refuse.
        min_count = max(8, int(0.12 * n))
        gated = [
            tr for tr in tracks
            if tr["count"] >= min_count
            and (
                tr["med_horiz"] >= HORIZ_LYING
                or (tr["wrist_range"] >= WRIST_PRESS_MIN and tr["area"] >= LIFTER_AREA_MIN)
                or tr["press_frac"] >= 0.4   # foreshortened-but-pressing lifter
            )
        ]
        if not gated:
            raise RuntimeError(no_lifter)
        # Among lifters, prefer the one that is present, visible, big, actually
        # pressing (wrist travel) AND whose wrists ride above the shoulders
        # (press_frac) — the last term rejects a seated/standing spotter that
        # otherwise scores well in a crowded gym.
        lifter = max(
            gated,
            key=lambda tr: tr["presence"] * (0.5 + tr["mean_vis"])
            * (0.5 + min(tr["area"], 0.4)) * (0.4 + 3.0 * tr["wrist_range"])
            * (0.3 + 1.5 * tr["press_frac"]),
        )
    else:  # squat / deadlift — upright(ish) lifter, softer gate + safe fallback
        min_count = max(6, int(0.10 * n))
        # Deadlift is hinged (torso near-horizontal at the floor), so it gets a
        # much more permissive horizon gate than the squat — otherwise the real
        # puller is rejected and coverage collapses even when fully in frame.
        horiz_max = HORIZ_UPRIGHT_DL if lift == "deadlift" else HORIZ_UPRIGHT
        gated = [
            tr for tr in tracks
            if tr["med_horiz"] <= horiz_max and tr["count"] >= min_count
        ]
        if gated:
            lifter = max(gated, key=lambda tr: (tr["presence"], tr["mean_score"]))
        else:
            lifter = max(
                tracks, key=lambda tr: tr["mean_score"] * (0.3 + tr["presence"])
            )
            if lifter["count"] < min_count:
                raise RuntimeError(
                    "no lifter detected — make sure the person performing the "
                    "lift is fully in frame and well lit"
                )

    xy = np.full((n, 33, 2), np.nan)
    vis = np.zeros((n, 33))
    for f, c in lifter["frames"].items():
        xy[f] = c["xy"]
        vis[f] = c["vis"]
    present = np.array(sorted(lifter["frames"].keys()))
    grid = np.arange(n)
    for j in range(33):
        for ax in (0, 1):
            xy[:, j, ax] = np.interp(grid, present, xy[present, j, ax])
    return xy, vis, int(lifter["count"])


def track_pose(
    video_path: str, lift: str = "bench", max_frames: int = 1200
) -> PoseTrack:
    import mediapipe as mp

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError("could not open video")
    raw_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    aspect = w / h

    # Cap the detection rate at ~24 fps: full resolution for normal 24/30 fps
    # clips (rep timing / velocity loss need it), but high-fps phone footage
    # (60/120 fps) is strided down so it isn't 2-4x slower for no gain. bar.py
    # mirrors the stride so the two signals stay frame-aligned.
    stride = max(1, round(raw_fps / 24.0))
    fps = raw_fps / stride
    frames: list[np.ndarray] = []
    idx = 0
    while len(frames) < max_frames:
        ok, frame = cap.read()
        if not ok:
            break
        if idx % stride == 0:
            frames.append(frame)
        idx += 1
    cap.release()
    if len(frames) < 6:
        raise RuntimeError("clip too short or unreadable (need >= 6 frames)")

    landmarker = _make_landmarker()
    try:
        code = _ROTATIONS[_best_rotation(frames, landmarker, aspect, lift, mp)]
        per_frame = [_detect_candidates(landmarker, fr, code, aspect, mp) for fr in frames]
        xy, vis, count = select_lifter_track(per_frame, fps, lift=lift)

        # Second pass: if the lifter is small/distant (low coverage), crop to
        # them and re-detect upscaled. A small lifter in a big frame is the
        # main cause of missed frames; cropping recovers most of them and also
        # excludes bystanders outside the box.
        coverage = count / max(1, len(frames))
        if coverage < 0.75:
            crop = _lifter_crop(xy, vis, w, h)
            if crop is not None:
                per_frame2 = [
                    _detect_in_region(landmarker, fr, code, aspect, mp, crop=crop)
                    for fr in frames
                ]
                try:
                    xy2, vis2, count2 = select_lifter_track(per_frame2, fps, lift=lift)
                    if count2 > count:
                        xy, vis, count = xy2, vis2, count2
                except RuntimeError:
                    pass  # crop pass found nothing usable — keep the full-frame result
    finally:
        landmarker.close()

    return PoseTrack(
        xy=xy,
        vis=vis,
        fps=float(fps),
        frame_size=(w, h),
        sample_frame=frames[len(frames) // 2],
        detected_frames=count,
        stride=stride,
    )
