"""Per-frame body pose for a bench-press clip (MediaPipe BlazePose).

Why pose instead of circle detection: a gym is full of circular plates, so
"find the round thing" is unwinnable. But the bar is locked in the lifter's
hands — the wrist line *is* the bar. Tracking the body is far more robust and
it also yields the joint angles needed for real form coaching (elbow flare,
wrist-over-elbow stack, torso/arch, leg drive).

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


class PoseTrack:
    def __init__(
        self,
        xy: np.ndarray,  # (n_frames, 33, 2) normalised image coords
        vis: np.ndarray,  # (n_frames, 33) visibility 0..1
        fps: float,
        frame_size: tuple[int, int],
        sample_frame: np.ndarray,
        detected_frames: int,
    ):
        self.xy = xy
        self.vis = vis
        self.fps = fps
        self.frame_size = frame_size
        self.sample_frame = sample_frame
        self.detected_frames = detected_frames
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

    opts = vision.PoseLandmarkerOptions(
        base_options=mtp.BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=vision.RunningMode.VIDEO,
        num_poses=5,  # gyms have spotters / bystanders — pick the bencher below
        min_pose_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    return vision.PoseLandmarker.create_from_options(opts)


# Torso orientation cleanly separates the lifter from bystanders:
#  - bench: the LIFTER is horizontal (lying); a standing spotter is vertical.
#  - squat / deadlift: the LIFTER is upright; we don't gate as hard there
#    (mid-rep the torso can lean), but we still prefer an upright torso to
#    exclude anyone sitting/lying nearby.
HORIZ_LYING = 0.40       # bench: med_horiz must be ABOVE this
HORIZ_UPRIGHT = 0.35     # squat/DL: med_horiz must be BELOW this


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
    score = 1.2 * min(area, 0.5) + 0.8 * in_frame + 0.5 * mean_vis
    return {
        "xy": xy,
        "vis": vis,
        "centroid": centroid,
        "area": max(area, 1e-4),
        "horiz": horiz,
        "score": score,
    }


def select_lifter_track(
    per_frame: list[list[dict]], fps: float, lift: str = "bench"
) -> tuple[np.ndarray, np.ndarray, int]:
    """Link detections into per-person tracks, then commit to the lifter:
    LYING DOWN for bench (rejects upright spotters), UPRIGHT for squat /
    deadlift (rejects anyone sitting / lying nearby). Pure / no MediaPipe so
    it is unit-testable."""
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
            tr["horiz"].append(c["horiz"])
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
                    "horiz": [c["horiz"]],
                    "count": 1,
                    "frames": {f: c},
                }
            )

    no_lifter = (
        "no lifter detected on a bench — make sure the person LYING on the "
        "bench is fully in frame and well lit (a standing spotter is ignored)"
    )
    if not tracks:
        raise RuntimeError(no_lifter)

    min_count = max(6, int(0.10 * n))
    for tr in tracks:
        tr["med_horiz"] = float(np.median(tr["horiz"]))
        tr["presence"] = tr["count"] / n
        tr["mean_score"] = tr["score_sum"] / tr["count"]

    if lift == "bench":
        keep = lambda tr: tr["med_horiz"] >= HORIZ_LYING            # noqa: E731
    else:                                                            # squat / DL
        keep = lambda tr: tr["med_horiz"] <= HORIZ_UPRIGHT           # noqa: E731
    gated = [tr for tr in tracks if keep(tr) and tr["count"] >= min_count]
    if gated:
        lifter = max(gated, key=lambda tr: (tr["presence"], tr["mean_score"]))
    else:
        # Bad angle / occlusion — fall back so we still return something.
        lifter = max(
            tracks, key=lambda tr: tr["mean_score"] * (0.3 + tr["presence"])
        )
        if lifter["count"] < min_count:
            raise RuntimeError(no_lifter)

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
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    aspect = w / h

    landmarker = _make_landmarker()
    frames: list[np.ndarray] = []
    per_frame: list[list[dict]] = []
    try:
        idx = 0
        while idx < max_frames:
            ok, frame = cap.read()
            if not ok:
                break
            frames.append(frame)
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mpimg = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            res = landmarker.detect_for_video(mpimg, int(idx * 1000.0 / fps))
            cands: list[dict] = []
            if res.pose_landmarks:
                for lms in res.pose_landmarks:
                    cxy = np.array([[lm.x, lm.y] for lm in lms], dtype=np.float64)
                    cvi = np.array([lm.visibility for lm in lms], dtype=np.float64)
                    cands.append(_candidate(cxy, cvi, aspect))
            per_frame.append(cands)
            idx += 1
    finally:
        landmarker.close()
        cap.release()

    xy, vis, count = select_lifter_track(per_frame, fps, lift=lift)
    return PoseTrack(
        xy=xy,
        vis=vis,
        fps=float(fps),
        frame_size=(w, h),
        sample_frame=frames[len(frames) // 2],
        detected_frames=count,
    )
