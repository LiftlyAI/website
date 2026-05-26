"""Bench analysis from a pose track.

The bar is the wrist line. Effort is read from *rep time* — how much the
concentric slows from the fastest rep to the last — not absolute m/s, which
needs scale calibration the user explicitly doesn't want. The bench
velocity-loss -> reps-in-reserve research drives the RPE. Body angles
(elbow flare, wrist-over-elbow stack, torso/arch, leg drive) feed the
Calgary-Barbell coaching.

Everything is body-relative (torso lengths, % of ROM) so it survives any
camera distance and never depends on plate size.
"""

from __future__ import annotations

import base64

import cv2
import numpy as np
from scipy.signal import find_peaks, savgol_filter

import pose as P

# Bench velocity-loss (%) -> reps in reserve, from the set notes:
# ~30% loss ~ halfway to failure, ~50% ~ 1.6 RIR (~RPE 8.5), ~80% ~ 0 RIR.
# Velocity-loss (%) -> reps-in-reserve. The bench curve is from the set
# notes; squat/DL slow LESS than bench at the same RIR (heavier load, longer
# ROM grind), so 30% loss on a squat is roughly halfway to failure rather
# than "3 RIR".
_LOSS_RIR_BENCH = [
    (0.0, 5.0), (15.0, 4.0), (30.0, 3.0), (40.0, 2.3),
    (50.0, 1.6), (60.0, 1.1), (70.0, 0.5), (80.0, 0.0),
]
_LOSS_RIR_SQUAT = [
    (0.0, 5.0), (15.0, 4.5), (30.0, 4.0), (45.0, 3.0),
    (55.0, 2.3), (65.0, 1.5), (75.0, 1.0), (85.0, 0.3), (95.0, 0.0),
]
_LOSS_RIR_DEADLIFT = _LOSS_RIR_SQUAT  # very similar grind profile


# Per-lift rep segmentation: thresholds that match each lift's actual tempo,
# so e.g. a 0.33s "concentric" can't survive as a squat rep.
_SEG_PARAMS = {
    "bench":    {"conc_min": 0.15, "conc_max": 6.0,  "desc_min": 0.10, "desc_max": 9.0,  "prom_frac": 0.35, "min_gap_s": 0.40},
    "squat":    {"conc_min": 0.50, "conc_max": 8.0,  "desc_min": 0.40, "desc_max": 8.0,  "prom_frac": 0.50, "min_gap_s": 1.50},
    "deadlift": {"conc_min": 0.50, "conc_max": 10.0, "desc_min": 0.30, "desc_max": 10.0, "prom_frac": 0.50, "min_gap_s": 1.50},
}


def _rir_from_loss(loss_pct: float, lift: str) -> float:
    a = (
        _LOSS_RIR_BENCH if lift == "bench"
        else _LOSS_RIR_DEADLIFT if lift == "deadlift"
        else _LOSS_RIR_SQUAT
    )
    if loss_pct <= a[0][0]:
        return a[0][1]
    if loss_pct >= a[-1][0]:
        return a[-1][1]
    for (l0, r0), (l1, r1) in zip(a, a[1:]):
        if l0 <= loss_pct <= l1:
            f = (loss_pct - l0) / (l1 - l0)
            return round((r0 + f * (r1 - r0)) * 10) / 10
    return 2.0


def _hampel(x: np.ndarray, win: int = 7, nsig: float = 3.0) -> np.ndarray:
    """Reject point spikes (the MediaPipe/CSRT teleport jumps that visibility
    gating misses — MP reports high confidence on hallucinated joints). Each
    sample more than nsig robust-sigmas from its local median is replaced by
    that median. This is what turns a scribble into a usable signal."""
    x = x.astype(np.float64)
    n = len(x)
    k = max(1, win // 2)
    pad = np.pad(x, k, mode="edge")
    out = x.copy()
    for i in range(n):
        seg = pad[i : i + 2 * k + 1]
        med = np.median(seg)
        mad = 1.4826 * np.median(np.abs(seg - med)) + 1e-9
        if abs(x[i] - med) > nsig * mad:
            out[i] = med
    return out


def _finite_fill(arr: np.ndarray) -> np.ndarray:
    """Linearly interpolate NaN/inf samples per column (column of all-bad -> 0)."""
    out = np.array(arr, dtype=np.float64, copy=True)
    idx = np.arange(out.shape[0])
    for c in range(out.shape[1]):
        col = out[:, c]
        good = np.isfinite(col)
        if good.sum() >= 2:
            out[:, c] = np.interp(idx, idx[good], col[good])
        elif good.sum() == 1:
            out[:, c] = col[good][0]
        else:
            out[:, c] = 0.0
    return out


def _smooth(sig: np.ndarray, fps: float) -> np.ndarray:
    win = max(5, int(round(fps * 0.13)) | 1)
    if win >= len(sig):
        win = (len(sig) - 1) if (len(sig) - 1) % 2 else (len(sig) - 2)
    if win < 5:
        return sig.astype(np.float64)
    return savgol_filter(sig, win, 2)


def _clean_signal(raw: np.ndarray, fps: float) -> np.ndarray:
    """Hampel despike → Savgol smooth."""
    return _smooth(_hampel(raw, win=max(5, int(fps * 0.2) | 1)), fps)


def _angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """Angle ABC in degrees, at vertex b."""
    v1, v2 = a - b, c - b
    n1, n2 = np.linalg.norm(v1), np.linalg.norm(v2)
    if n1 < 1e-6 or n2 < 1e-6:
        return float("nan")
    cos = np.clip(np.dot(v1, v2) / (n1 * n2), -1, 1)
    return float(np.degrees(np.arccos(cos)))


class _Body:
    """Isotropic, visibility-weighted joint accessors."""

    def __init__(self, track: P.PoseTrack):
        w, h = track.frame_size
        self.aspect = w / h
        self.xy = track.xy.copy()
        self.xy[:, :, 0] *= self.aspect  # make x/y the same physical unit
        self.vis = track.vis
        self.n = track.total_frames

    def j(self, idx: int) -> np.ndarray:
        return self.xy[:, idx, :]  # (n,2)

    def mid(self, li: int, ri: int) -> np.ndarray:
        a, b = self.j(li), self.j(ri)
        wl = self.vis[:, li : li + 1]
        wr = self.vis[:, ri : ri + 1]
        s = np.clip(wl + wr, 1e-6, None)
        return (a * wl + b * wr) / s

    def best(self, li: int, ri: int) -> np.ndarray:
        """Per-frame pick the more visible of a left/right pair."""
        a, b = self.j(li), self.j(ri)
        use_l = (self.vis[:, li] >= self.vis[:, ri])[:, None]
        return np.where(use_l, a, b)


def analyze_lift(
    track: P.PoseTrack,
    lift: str = "bench",
    bar_px: np.ndarray | None = None,
    plate_r: float = 0.0,
) -> dict:
    fps = track.fps
    n = track.total_frames
    t = np.arange(n) / fps
    w, h = track.frame_size
    aspect = w / h
    B = _Body(track)

    if bar_px is not None and np.isfinite(bar_px).all():
        # The real plate path (px) — cleaned/despiked in bar.py. Convert to
        # the same isotropic convention _Body uses (x scaled by aspect).
        bar = np.column_stack([(bar_px[:n, 0] / w) * aspect, bar_px[:n, 1] / h])
        bar_source = "plate"
    else:
        bar = B.best(P.L_WR, P.R_WR)        # fallback: wrist line (less reliable)
        bar_source = "wrist"
    # A single NaN propagates through hampel/savgol and corrupts the whole
    # signal (and the JSON response). Interpolate any non-finite samples.
    bar = _finite_fill(bar)
    shoulder = B.mid(P.L_SH, P.R_SH)
    hip = B.mid(P.L_HIP, P.R_HIP)
    elbow = B.best(P.L_EL, P.R_EL)
    ankle = B.mid(P.L_AN, P.R_AN)
    knee = B.mid(P.L_KN, P.R_KN)

    torso = float(np.nanmedian(np.linalg.norm(shoulder - hip, axis=1))) or 0.2

    # Hampel despike (kills teleport spikes) then smooth — this is what makes
    # the signal usable even when plate/wrist tracking is imperfect.
    barX = _clean_signal(bar[:, 0], fps)
    up = _clean_signal(-bar[:, 1], fps)      # +up
    vy = np.gradient(up, t)
    # Robust ROM (percentile) so a residual spike can't blow up thresholds.
    rom = float(np.percentile(up, 97) - np.percentile(up, 3))

    # A real bench press travels a large fraction of the frame vertically;
    # tracking noise barely moves. Below this the signal isn't a lift — bail
    # rather than carve fake reps out of jitter.
    ROM_MIN = 0.08
    warnings: list[str] = []
    if rom < ROM_MIN:
        warnings.append(
            "The bar's vertical travel is too small/noisy to read reps — film "
            "from the side / foot of the bench with the full press visible."
        )
        bottoms = np.array([], dtype=int)
        tops = np.array([], dtype=int)
    else:
        # Per-lift segmentation: bench reps are short and fast, squat / DL are
        # slow and long. Using bench thresholds on a squat creates 5 hallucinated
        # micro-reps where there's actually one slow rep.
        seg = _SEG_PARAMS.get(lift, _SEG_PARAMS["bench"])
        prom = max(0.02, rom * seg["prom_frac"])
        gap = max(1, int(fps * seg["min_gap_s"]))
        bottoms, _ = find_peaks(-up, prominence=prom, distance=gap)
        tops, _ = find_peaks(up, prominence=prom, distance=gap)

    seg = _SEG_PARAMS.get(lift, _SEG_PARAMS["bench"])
    CONC_MIN, CONC_MAX = seg["conc_min"], seg["conc_max"]
    DESC_MIN, DESC_MAX = seg["desc_min"], seg["desc_max"]

    reps: list[dict] = []
    rep_no = 0
    for b0 in bottoms:
        prior = tops[tops < b0]
        start = int(prior[-1]) if len(prior) else 0
        later = tops[tops > b0]
        end = int(later[0]) if len(later) else (n - 1)
        if end - start < 3:
            continue
        # Refine the bottom = lowest bar point (the chest touch).
        b = start + int(np.argmin(up[start : end + 1]))
        if not (start < b < end):
            continue

        peak_speed = float(np.max(np.abs(vy[start : end + 1]))) or 1e-6
        thr = 0.10 * peak_speed  # "the bar is clearly moving" threshold

        # Descent timer STARTS when the bar actually starts moving down
        # (not while it's still parked at lockout / being unracked).
        descent_start = start
        while descent_start < b and vy[descent_start] > -thr:
            descent_start += 1
        # Pause = near-stationary window bracketing the chest touch.
        ps = b
        while ps > descent_start and abs(vy[ps - 1]) < thr:
            ps -= 1
        pe = b
        while pe < end and abs(vy[pe + 1]) < thr:
            pe += 1
        # Concentric ENDS at full extension = highest bar point after it
        # leaves the chest (arms locked out).
        ls = pe + int(np.argmax(up[pe : end + 1]))
        if ls <= pe:
            ls = end

        concentric_s = (ls - pe) / fps                 # chest -> arms locked
        descent_s = (ps - descent_start) / fps          # starts moving down -> chest
        pause_s = max(0.0, (pe - ps) / fps)
        rise = float(up[ls] - up[b])

        # Reject implausible segments instead of reporting garbage.
        if not (CONC_MIN <= concentric_s <= CONC_MAX):
            continue
        if not (DESC_MIN <= descent_s <= DESC_MAX):
            continue
        if rise < 0.45 * rom:
            continue

        rep_no += 1
        rep_rom = float(up[start : end + 1].max() - up[start : end + 1].min())

        # --- bar-path / J-curve (body-relative) ---
        drift = float(barX[ls] - barX[b])                 # +/- horizontal travel on press
        bar_off_touch = float(barX[b] - shoulder[b, 0])   # bar vs shoulder, signed
        bar_off_lock = float(barX[ls] - shoulder[ls, 0])
        # Did the bar move back toward stacking over the shoulder? (the J-curve)
        toward_shoulder = abs(bar_off_touch) - abs(bar_off_lock)
        horiz_excursion = float(barX[start : end + 1].max() - barX[start : end + 1].min())
        curve_ratio = horiz_excursion / max(1e-6, rep_rom)  # 0 = pure vertical
        # Touch height between shoulder(0) and hip(1) lines.
        sh_up, hip_up = -shoulder[b, 1], -hip[b, 1]
        denom = (sh_up - hip_up) or 1e-6
        touch_on_torso = float((sh_up - up[b]) / denom)

        # --- joint angles (bench-specific) ---
        elbow_bottom = _angle(shoulder[b], elbow[b], bar[b])
        elbow_lockout = _angle(shoulder[ls], elbow[ls], bar[ls])
        upper_arm = elbow[b] - shoulder[b]
        flare = _angle(elbow[b] + upper_arm, shoulder[b], hip[b])  # upper-arm vs torso
        wrist_stack = float((bar[b, 0] - elbow[b, 0]) / max(1e-6, torso))

        # --- squat extras: depth (hip vs knee) + knee tracking (valgus) at b ---
        # iso y: larger = lower in the image = physically lower; hip below
        # knee at the bottom = at/below parallel (good depth).
        depth_hip_minus_knee = float((hip[b, 1] - knee[b, 1]) / torso)
        # knee inside ankle (toward midline) at the bottom = valgus.
        knee_vs_ankle = float((knee[b, 0] - ankle[b, 0]) / max(1e-6, torso))

        # --- deadlift extras: bar over midfoot AT LIFT-OFF + lockout angle ---
        # Measured at the bottom (when the bar leaves the floor) rather than
        # averaged over the whole pull — at lockout the wrist sits forward of
        # the ankle which used to inflate this number even on clean pulls.
        bar_over_midfoot = float(abs(barX[b] - ankle[b, 0]) / max(1e-6, torso))
        lockout_hka = _angle(hip[ls], knee[ls], ankle[ls])

        # --- hip vs shoulder rise-sync at the start of the concentric ---
        # If the hips rise faster than the shoulders right out of the bottom,
        # the chest gets dumped forward (the classic "hips shoot up" fault on
        # squat / deadlift). +ve = hip leads; ~0 = simultaneous; -ve = shoulders
        # leading the hips.
        w = max(2, int(fps * 0.3))
        i0 = pe
        i1 = min(ls, pe + w)
        if i1 > i0:
            d_hip = float((-hip[i1, 1]) - (-hip[i0, 1]))
            d_sh = float((-shoulder[i1, 1]) - (-shoulder[i0, 1]))
            hip_lead = (d_hip - d_sh) / max(1e-6, rep_rom)
        else:
            hip_lead = 0.0

        reps.append(
            {
                "index": rep_no,
                "descentS": round(descent_s, 3),
                "pauseS": round(pause_s, 3),
                "concentricS": round(concentric_s, 3),
                "romTorso": round(rep_rom / torso, 3),
                "barDriftTorso": round(drift / torso, 3),
                "towardShoulderTorso": round(toward_shoulder / torso, 3),
                "curveRatio": round(curve_ratio, 3),
                "touchOnTorso": round(touch_on_torso, 3),
                "elbowAngleBottom": None if np.isnan(elbow_bottom) else round(elbow_bottom, 1),
                "elbowAngleLockout": None if np.isnan(elbow_lockout) else round(elbow_lockout, 1),
                "elbowFlareDeg": None if np.isnan(flare) else round(flare, 1),
                "wristAheadOfElbowTorso": round(wrist_stack, 3),
                "depthHipMinusKneeTorso": round(depth_hip_minus_knee, 3),
                "kneeVsAnkleTorso": round(knee_vs_ankle, 3),
                "barOverMidfootTorso": round(bar_over_midfoot, 3),
                "lockoutHipKneeAnkleDeg": None if np.isnan(lockout_hka) else round(lockout_hka, 1),
                "hipLeadAtStartTorso": round(hip_lead, 3),
                "phases": {
                    "descent": [round(float(t[start]), 3), round(float(t[ps]), 3)],
                    "pause": [round(float(t[ps]), 3), round(float(t[pe]), 3)],
                    "press": [round(float(t[pe]), 3), round(float(t[ls]), 3)],
                    "lockout": [round(float(t[ls]), 3), round(float(t[end]), 3)],
                },
            }
        )

    summary = _effort_and_form(reps, B, torso, up, barX, fps, lift)

    # Draw the SAME smoothed path the analysis used (back to pixels), so the
    # overlay matches the numbers instead of looking like a scribble.
    path_px = np.column_stack([(barX / aspect) * w, (-up) * h])
    overlay = _render_overlay(track, path_px, plate_r if bar_source == "plate" else 0.0)

    if bar_source == "wrist":
        warnings.append(
            "Couldn't lock the plate near the hands — fell back to wrist "
            "tracking, which is less accurate. Keep the bar/plate clearly lit "
            "and in frame."
        )
    if not reps:
        if bar_source == "wrist":
            warnings.append(
                "Couldn't read clean reps — the plate couldn't be locked and "
                "the wrist signal was too noisy. Best results: side / foot-of-"
                "bench angle, the loaded plate fully in frame and well lit, "
                "camera steady."
            )
        else:
            warnings.append(
                "Tracked the bar but couldn't isolate distinct reps — make "
                "sure the whole lift (unrack -> re-rack) is in frame."
            )

    n_pts = max(1, n // 240)
    return {
        "lift": lift,
        "fps": round(fps, 3),
        "barSource": bar_source,
        "pose": {
            "detectedFrames": track.detected_frames,
            "totalFrames": n,
            "coverage": round(track.coverage, 3),
            "quality": track.quality,
        },
        "path": [
            {
                "t": round(float(t[i]), 3),
                "x": round(float(barX[i]), 4),
                "y": round(float(up[i]), 4),
            }
            for i in range(0, n, n_pts)
        ],
        "reps": reps,
        "summary": summary,
        "overlayPng": overlay,
        "warnings": warnings,
    }


def _bench_notes(reps, hip_stab, shoulder_stab, foot_mv) -> tuple[list[str], str]:
    notes: list[str] = []
    flares = [r["elbowFlareDeg"] for r in reps if r["elbowFlareDeg"] is not None]
    if flares:
        mf = float(np.mean(flares))
        if mf > 80:
            notes.append(f"Elbows flaring (~{mf:.0f} deg from torso) — tuck toward 45-75 deg.")
        elif mf < 30:
            notes.append(f"Elbows very tucked (~{mf:.0f} deg) — watch the bar drifting low to the belly.")
        else:
            notes.append(f"Elbow tuck ~{mf:.0f} deg from torso — in the healthy 45-75 deg range.")
    mw = float(np.mean([r["wristAheadOfElbowTorso"] for r in reps]))
    if abs(mw) > 0.15:
        where = "ahead of (toward the feet)" if mw > 0 else "behind"
        notes.append(
            f"Bar/wrist sits {where} the elbow at the chest (~{abs(mw):.2f} torso) — "
            "stack wrist over elbow or it becomes a front-delt raise."
        )
    else:
        notes.append("Wrist stays stacked over the elbow at the chest — good.")
    toward = float(np.mean([r["towardShoulderTorso"] for r in reps]))
    if toward > 0.04:
        notes.append("Bar curves back over the shoulders on the press — J-curve, good leverage.")
    elif toward < -0.04:
        notes.append("Bar drifts AWAY from the shoulders on the press — poor leverage.")
    else:
        notes.append("Bar presses nearly straight up — little J-curve; expect a harder lockout.")
    if hip_stab > 0.06:
        notes.append("Hips move a lot — arch breaking down; reset leg drive.")
    if shoulder_stab > 0.05:
        notes.append("Shoulders travel during the press — keep blades pinned and down.")
    if foot_mv > 0.08:
        notes.append("Feet shifting — losing leg drive; plant and drive toward your head.")
    drift = float(np.mean([abs(r["barDriftTorso"]) for r in reps]))
    curve = float(np.mean([r["curveRatio"] for r in reps]))
    bar_note = (
        f"Bench bar path is {'a clear curve' if curve > 0.15 else 'nearly straight'} "
        f"(horizontal travel ~{drift:.2f} torso on the press)."
    )
    return notes, bar_note


def _squat_notes(reps, hip_stab, foot_mv) -> tuple[list[str], str]:
    notes: list[str] = []
    depths = [r["depthHipMinusKneeTorso"] for r in reps]
    md = float(np.mean(depths))
    if md > 0.03:
        notes.append(f"Depth is below parallel ({md:+.2f} torso hip-below-knee) — good.")
    elif md > -0.03:
        notes.append("Hitting roughly parallel — borderline for comp depth.")
    else:
        notes.append(f"Squat is high — hip stays above the knee ({md:+.2f} torso). Drop deeper.")
    knees = [r["kneeVsAnkleTorso"] for r in reps]
    mk = float(np.mean(knees))
    # Convention: positive = knee outboard of ankle = tracking out; negative = inside = valgus.
    if mk < -0.05:
        notes.append(
            f"Knees collapse inward at the bottom (~{abs(mk):.2f} torso inside the ankle) — "
            "drive knees out in the direction of the toes."
        )
    elif mk > 0.18:
        notes.append("Knees track well outboard of the ankles — good.")
    else:
        notes.append("Knees track in line with the toes — good.")
    drift = float(np.mean([abs(r["barDriftTorso"]) for r in reps]))
    if drift > 0.12:
        notes.append(f"Bar drifts ~{drift:.2f} torso horizontally — keep it stacked over mid-foot.")
    else:
        notes.append("Bar path is nearly vertical over mid-foot — good.")
    # Hip-shoots-up fault at the start of the drive — the real squat fault.
    hip_lead = float(np.mean([r.get("hipLeadAtStartTorso", 0.0) for r in reps]))
    if hip_lead > 0.05:
        notes.append(
            f"Hips rise faster than the chest out of the hole (+{hip_lead:.2f} torso lead) — "
            "drive the chest up WITH the hips, don't fold forward."
        )
    # Note: 'feet shift' is unreliable from pose (ankle landmarks wobble even
    # when the lifter is rock-steady), so we don't emit that line.
    rom = float(np.mean([r["romTorso"] for r in reps]))
    bar_note = f"Squat bar path: ~{drift:.2f} torso horizontal drift, ROM ~{rom:.2f} torso."
    return notes, bar_note


def _deadlift_notes(reps, hip_stab, foot_mv) -> tuple[list[str], str]:
    notes: list[str] = []
    # Measured at lift-off (bottom of the rep) — averaging across the whole
    # pull used to inflate this number even on clean lifts.
    mid = float(np.mean([r["barOverMidfootTorso"] for r in reps]))
    if mid < 0.15:
        notes.append(f"Bar over the mid-foot at lift-off (~{mid:.2f} torso) — good.")
    elif mid > 0.30:
        notes.append(
            f"Bar sets up well forward of the mid-foot (~{mid:.2f} torso) — "
            "set the shins ~½\" behind the bar so the bar sits over the mid-foot."
        )
    # Hip-shoots-up: the most common DL fault and the one actually worth naming.
    hip_lead = float(np.mean([r.get("hipLeadAtStartTorso", 0.0) for r in reps]))
    if hip_lead > 0.05:
        notes.append(
            f"Hips shoot up faster than the chest out of the floor (+{hip_lead:.2f} torso lead) — "
            "set the hips a touch higher and stay tight on the hamstrings; "
            "chest and hips should rise together."
        )
    elif hip_lead < -0.05:
        notes.append(
            f"Shoulders rise faster than the hips at lift-off ({hip_lead:.2f} torso) — "
            "load the hamstrings; don't let the hips drop into a squat-the-DL."
        )
    drift = float(np.mean([abs(r["barDriftTorso"]) for r in reps]))
    if drift > 0.20:
        notes.append(
            f"Bar swings ~{drift:.2f} torso horizontally on the pull — should be straight up "
            "the legs, dragging the shins."
        )
    locks = [r["lockoutHipKneeAnkleDeg"] for r in reps if r["lockoutHipKneeAnkleDeg"] is not None]
    if locks:
        ml = float(np.mean(locks))
        if ml < 160:
            notes.append(f"Lockout hip/knee not fully extended (~{ml:.0f} deg) — squeeze glutes; stand tall.")
        else:
            notes.append(f"Strong lockout — hip/knee ~{ml:.0f} deg.")
    # 'feet shift' from pose is unreliable (ankle landmarks wobble even when
    # the lifter is rock-steady) — don't emit it.
    rom = float(np.mean([r["romTorso"] for r in reps]))
    bar_note = f"Deadlift bar path: ~{drift:.2f} torso horizontal drift, ROM ~{rom:.2f} torso."
    return notes, bar_note


def _effort_and_form(reps, B: _Body, torso, up, barX, fps, lift) -> dict:
    if not reps:
        return {
            "repCount": 0,
            "rir": None,
            "rpe": None,
            "rpeConfidence": "rough",
            "velocityLossPct": None,
            "barPathNote": "No reps segmented.",
            "formNotes": [],
        }

    times = [r["concentricS"] for r in reps]
    t_fast = min(times)
    t_last = times[-1]
    loss = (1.0 - t_fast / t_last) * 100.0 if len(times) >= 2 else 0.0
    loss = max(0.0, loss)

    # The wall: first rep that abruptly jumps vs the previous one.
    wall = None
    for i in range(1, len(times)):
        if times[i] > 1.4 * times[i - 1] and times[i] > 1.3 * t_fast:
            wall = reps[i]["index"]
            break

    if len(times) >= 2:
        rir = _rir_from_loss(loss, lift)
        rpe = max(4.0, min(10.0, round((10.0 - rir) * 2) / 2))
        conf = "estimated" if len(times) >= 3 else "rough"
    else:
        rir = None
        rpe = None
        conf = "rough"

    for r in reps:
        r["slowdownVsFastestPct"] = round((1.0 - t_fast / r["concentricS"]) * 100.0, 1)

    # Clip-level stability is meaningful for every lift.
    sh = B.mid(P.L_SH, P.R_SH)
    hip = B.mid(P.L_HIP, P.R_HIP)
    ank = B.mid(P.L_AN, P.R_AN)
    shoulder_stability = float(np.std(-sh[:, 1]) / torso)
    hip_stability = float(np.std(-hip[:, 1]) / torso)
    foot_movement = float(np.std(ank[:, 0]) / torso + np.std(ank[:, 1]) / torso)

    if lift == "bench":
        notes, bar_note = _bench_notes(reps, hip_stability, shoulder_stability, foot_movement)
    elif lift == "squat":
        notes, bar_note = _squat_notes(reps, hip_stability, foot_movement)
    else:  # deadlift
        notes, bar_note = _deadlift_notes(reps, hip_stability, foot_movement)

    return {
        "repCount": len(reps),
        "firstRepConcentricS": round(times[0], 3),
        "fastestRepConcentricS": round(t_fast, 3),
        "lastRepConcentricS": round(t_last, 3),
        "velocityLossPct": round(loss, 1),
        "wallRepIndex": wall,
        "rir": rir,
        "rpe": rpe,
        "rpeConfidence": conf,
        "barPathNote": bar_note,
        "shoulderStabilityTorso": round(shoulder_stability, 3),
        "hipStabilityTorso": round(hip_stability, 3),
        "footMovementTorso": round(foot_movement, 3),
        "formNotes": notes,
    }


_SKELETON = [
    (P.L_SH, P.R_SH), (P.L_SH, P.L_EL), (P.L_EL, P.L_WR),
    (P.R_SH, P.R_EL), (P.R_EL, P.R_WR), (P.L_SH, P.L_HIP),
    (P.R_SH, P.R_HIP), (P.L_HIP, P.R_HIP), (P.L_HIP, P.L_KN),
    (P.L_KN, P.L_AN), (P.R_HIP, P.R_KN), (P.R_KN, P.R_AN),
]


def _render_overlay(track: P.PoseTrack, path_px: np.ndarray, plate_r: float) -> str:
    """`path_px` is the SMOOTHED analysed bar path, already in pixels."""
    img = track.sample_frame.copy()
    w, h = track.frame_size
    mid = track.total_frames // 2

    # skeleton of the selected lifter on the representative frame
    for a, b in _SKELETON:
        pa = (int(track.xy[mid, a, 0] * w), int(track.xy[mid, a, 1] * h))
        pb = (int(track.xy[mid, b, 0] * w), int(track.xy[mid, b, 1] * h))
        cv2.line(img, pa, pb, (0, 220, 120), 2)
    for i in P.KEYPOINTS:
        c = (int(track.xy[mid, i, 0] * w), int(track.xy[mid, i, 1] * h))
        cv2.circle(img, c, 4, (0, 255, 180), -1)

    path = path_px.astype(np.int32)
    for i in range(1, len(path)):
        cv2.line(img, tuple(path[i - 1]), tuple(path[i]), (40, 160, 255), 2)
    if plate_r > 1:  # show the tracked plate at the mid frame
        cv2.circle(img, tuple(path[mid]), int(plate_r), (255, 255, 255), 2)
    cv2.circle(img, tuple(path[0]), 7, (0, 255, 0), -1)
    cv2.circle(img, tuple(path[-1]), 7, (0, 0, 255), -1)

    ok, buf = cv2.imencode(".png", img, [cv2.IMWRITE_PNG_COMPRESSION, 6])
    return base64.b64encode(buf.tobytes()).decode("ascii") if ok else ""
