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
import os

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
    "bench":    {"conc_min": 0.25, "conc_max": 6.0,  "desc_min": 0.12, "desc_max": 9.0,  "prom_frac": 0.35, "min_gap_s": 0.40},
    "squat":    {"conc_min": 0.50, "conc_max": 8.0,  "desc_min": 0.40, "desc_max": 8.0,  "prom_frac": 0.50, "min_gap_s": 1.50},
    # Deadlift has NO required eccentric: the bar is DROPPED from lockout (a
    # 0.03-0.13s "descent") and the first rep starts dead from the floor with no
    # lowering at all. Requiring a controlled descent (as bench/squat do) rejected
    # every valid pull. The concentric/ROM/prominence gates still guard false reps.
    "deadlift": {"conc_min": 0.50, "conc_max": 10.0, "desc_min": 0.0,  "desc_max": 10.0, "prom_frac": 0.50, "min_gap_s": 1.50},
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


def _heavy_smooth(sig: np.ndarray, fps: float, secs: float = 0.6) -> np.ndarray:
    """Strong low-pass for the RENDERED horizontal bar path only. The bar's
    true sideways motion is small and slow (the J-curve), so aggressive
    smoothing turns landmark/tracker jitter — the 'scribble' — into a gentle
    curve without affecting the vertical rep analysis."""
    s = _hampel(sig.astype(np.float64), win=max(5, int(fps * 0.3) | 1))
    win = max(5, int(round(fps * secs)) | 1)
    if win >= len(s):
        return s
    return savgol_filter(s, win, 2)


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


def _segment_reps(bottoms, tops, *, up, vy, t, fps, n, rom, barX, shoulder,
                  hip, elbow, ankle, knee, torso, bar, real_frames,
                  conc_rng, desc_max, desc_min) -> list[dict]:
    """Carve rep candidates out of one (bottoms, tops) peak set and gate them.
    Pure so the caller can try denser peaks and keep whichever yields more
    valid reps (rep-merge recovery, F8a)."""
    CONC_MIN, CONC_MAX = conc_rng
    reps: list[dict] = []
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

        # Pause = near-stationary window bracketing the chest touch.
        ps = b
        while ps > start and abs(vy[ps - 1]) < thr:
            ps -= 1
        pe = b
        while pe < end and abs(vy[pe + 1]) < thr:
            pe += 1
        # Descent = the controlled lowering INTO the chest.
        descent_start = ps
        while descent_start > start and vy[descent_start - 1] <= -thr:
            descent_start -= 1
        # Concentric ENDS at lockout = end of the FIRST upward drive.
        press_top = pe + int(np.argmax(up[pe : end + 1]))
        press_rise = float(up[press_top] - up[pe]) or 1e-6
        ls = press_top
        for f in range(pe + 1, press_top + 1):
            if up[f] - up[pe] >= 0.6 * press_rise and vy[f] <= thr:
                ls = f
                break

        concentric_s = (ls - pe) / fps
        descent_s = (ps - descent_start) / fps
        pause_s = max(0.0, (pe - ps) / fps)
        rise = float(up[ls] - up[b])

        if os.environ.get("SEG_DEBUG"):
            print(f"[seg] cand b={b} conc={concentric_s:.2f}s desc={descent_s:.2f}s "
                  f"rise={rise:.3f} rom={rom:.3f} rise/rom={rise / max(rom, 1e-6):.2f}")
        # A candidate built mostly from INTERPOLATED frames is synthetic
        # motion, not a rep (F1b).
        real_frac = float(np.mean(real_frames[start:end + 1]))
        if real_frac < 0.55:
            if os.environ.get("SEG_DEBUG"):
                print(f"[seg] drop b={b}: real_frac={real_frac:.2f} (interpolated)")
            continue
        if not (CONC_MIN <= concentric_s <= CONC_MAX):
            continue
        if descent_s > desc_max:
            continue
        if rise < 0.45 * rom:
            continue
        # REPORT, don't reject (F10): a too-fast descent on a real rep is a
        # coaching fault (touch-and-go), not segmentation noise.
        touch_and_go = bool(descent_s < max(0.15, desc_min) or pause_s < 0.10)

        rep_rom = float(up[start : end + 1].max() - up[start : end + 1].min())

        # --- bar-path / J-curve (body-relative) ---
        drift = float(barX[ls] - barX[b])
        bar_off_touch = float(barX[b] - shoulder[b, 0])
        bar_off_lock = float(barX[ls] - shoulder[ls, 0])
        toward_shoulder = abs(bar_off_touch) - abs(bar_off_lock)
        horiz_excursion = float(barX[start : end + 1].max() - barX[start : end + 1].min())
        curve_ratio = horiz_excursion / max(1e-6, rep_rom)
        sh_up, hip_up = -shoulder[b, 1], -hip[b, 1]
        denom = (sh_up - hip_up) or 1e-6
        touch_on_torso = float((sh_up - up[b]) / denom)

        # --- joint angles (bench-specific) ---
        elbow_bottom = _angle(shoulder[b], elbow[b], bar[b])
        elbow_lockout = _angle(shoulder[ls], elbow[ls], bar[ls])
        upper_arm = elbow[b] - shoulder[b]
        flare = _angle(elbow[b] + upper_arm, shoulder[b], hip[b])
        wrist_stack = float((bar[b, 0] - elbow[b, 0]) / max(1e-6, torso))

        # --- squat extras ---
        depth_hip_minus_knee = float((hip[b, 1] - knee[b, 1]) / torso)
        knee_vs_ankle = float((knee[b, 0] - ankle[b, 0]) / max(1e-6, torso))

        # --- deadlift extras ---
        bar_over_midfoot = float(abs(barX[b] - ankle[b, 0]) / max(1e-6, torso))
        lockout_hka = _angle(hip[ls], knee[ls], ankle[ls])

        # --- hip vs shoulder rise-sync at the start of the concentric ---
        win = max(2, int(fps * 0.3))
        i0 = pe
        i1 = min(ls, pe + win)
        if i1 > i0:
            d_hip = float((-hip[i1, 1]) - (-hip[i0, 1]))
            d_sh = float((-shoulder[i1, 1]) - (-shoulder[i0, 1]))
            hip_lead = (d_hip - d_sh) / max(1e-6, rep_rom)
        else:
            hip_lead = 0.0

        reps.append(
            {
                "index": len(reps) + 1,
                "touchAndGo": touch_and_go,
                "descentS": round(descent_s, 3),
                "pauseS": round(pause_s, 3),
                "concentricS": round(concentric_s, 3),
                "romTorso": round(rep_rom / torso, 3),
                "concRiseTorso": round(rise / torso, 3),
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
    return reps


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

    # Vertical analysis (reps, RPE, timing) uses the plate when the tracker
    # validated it (moves with the wrist, near the hands, smooth); else the
    # wrist line. The plate's VERTICAL signal is the cleanest rep cue. Its
    # horizontal position jitters between plate/collar/sleeve, so the OVERLAY
    # and J-curve are drawn from the wrist instead (see _bench_render_path).
    if bar_px is not None and np.isfinite(bar_px).all():
        bar = np.column_stack([(bar_px[:n, 0] / w) * aspect, bar_px[:n, 1] / h])
        bar_source = "plate"
    elif lift == "squat":
        # The bar rides ON the shoulders — the shoulder midpoint IS the bar
        # height (± neck thickness), and shoulders are the most reliably
        # detected keypoints (no hand occlusion by plates/rack). The CSRT
        # plate tracker is the confirmed F7 defect (locks stationary rack
        # plates → flat signal → 0 reps at 98% coverage); wrist is second
        # choice but wobbles when hands re-grip.
        bar = B.mid(P.L_SH, P.R_SH)
        bar_source = "shoulder"
    else:
        # ONE wrist for the WHOLE clip, chosen by majority visibility. The
        # per-frame best-of pick teleports when L/R identity flips frame to
        # frame (RTMPose swaps sides on lying bodies); the vis-weighted
        # midpoint breaks the opposite way (the occluded far wrist is
        # hallucinated on clean side views). A single consistent side is
        # immune to both: the camera-side wrist wins the vote on side views,
        # and flip noise can't alternate the signal mid-clip.
        side = P.L_WR if float(np.mean(B.vis[:, P.L_WR])) >= float(np.mean(B.vis[:, P.R_WR])) else P.R_WR
        bar = B.j(side)
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
    # Measured over REAL frames only: interpolated gap spans sweep across the
    # frame and inflate rom, which then makes genuine reps fail the
    # rise/rom gate (squat_lowbar__1kn0yi5: real 1.8-2.3s reps rejected at
    # rise/rom=0.36 because junk doubled the denominator).
    _rf = track.vis[:, P.KEYPOINTS].sum(axis=1) > 0
    _up_real = up[_rf] if _rf.sum() >= 10 else up
    rom = float(np.percentile(_up_real, 97) - np.percentile(_up_real, 3))

    # A real lift travels a large fraction of a TORSO vertically; tracking
    # noise barely moves. Torso-relative (NOT frame-relative — a distant
    # lifter shrinks frame-fraction travel while torso units are invariant;
    # frame-relative 0.08 rejected genuine lifts, see ANALYSIS.md F8b).
    ROM_MIN = 0.45 * torso
    # Frames where the lifter was actually DETECTED (vis carries through the
    # selector; interpolated gap frames have vis=0). Linear interpolation over
    # gaps manufactures teleport "reps" (F1b) — segmentation must know which
    # samples are real.
    real_frames = track.vis[:, P.KEYPOINTS].sum(axis=1) > 0
    warnings: list[str] = []
    if rom < ROM_MIN:
        warnings.append(
            "The bar's vertical travel is too small/noisy to read reps — film "
            "from the side with the whole body and the full lift visible."
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
        if os.environ.get("SEG_DEBUG"):
            print(f"[seg] lift={lift} rom={rom:.3f} torso={torso:.3f} prom={prom:.3f} gap={gap} "
                  f"bottoms={list(bottoms)} tops={list(tops)} fps={fps:.1f} n={n}")
    if os.environ.get("SEG_DEBUG") and rom < ROM_MIN:
        print(f"[seg] REJECT-ALL rom={rom:.3f} < ROM_MIN={ROM_MIN:.3f} (0.45*torso)")

    seg = _SEG_PARAMS.get(lift, _SEG_PARAMS["bench"])
    CONC_MIN, CONC_MAX = seg["conc_min"], seg["conc_max"]
    DESC_MIN, DESC_MAX = seg["desc_min"], seg["desc_max"]

    def _build_reps(bottoms, tops) -> list[dict]:
        return _segment_reps(
            bottoms, tops, up=up, vy=vy, t=t, fps=fps, n=n, rom=rom,
            barX=barX, shoulder=shoulder, hip=hip, elbow=elbow, ankle=ankle,
            knee=knee, torso=torso, bar=bar, real_frames=real_frames,
            conc_rng=(CONC_MIN, CONC_MAX), desc_max=DESC_MAX, desc_min=DESC_MIN,
        )

    reps = _build_reps(bottoms, tops)
    # Rep-merge recovery (F8a), OUTCOME-validated: when brief lockouts merge
    # several pulls under one prominence peak, the mega-candidate dies at
    # CONC_MAX (deadlift_conv__1koke0d: 3 pulls -> 1 bottom -> 0 reps). Retry
    # with denser peaks and keep the retry ONLY if it yields more valid reps —
    # an unvalidated retry injected noise peaks into healthy clips and broke
    # them, so the gate is "did real reps increase", nothing weaker.
    if rom >= ROM_MIN and len(reps) < max(len(bottoms), len(tops), 1):
        seg = _SEG_PARAMS.get(lift, _SEG_PARAMS["bench"])
        prom2 = max(0.02, rom * seg["prom_frac"] / 2)
        gap2 = max(1, int(fps * seg["min_gap_s"]) // 2)
        b2, _ = find_peaks(-up, prominence=prom2, distance=gap2)
        t2, _ = find_peaks(up, prominence=prom2, distance=gap2)
        reps2 = _build_reps(b2, t2)
        if len(reps2) > len(reps):
            if os.environ.get("SEG_DEBUG"):
                print(f"[seg] retry adopted: {len(reps)} -> {len(reps2)} reps")
            reps = reps2

    # Deadlift top-driven fallback: between pulls the lifter often RELEASES
    # the bar and stands (chalk, breathe, re-grip), so the wrist signal never
    # returns to floor level and bottom peaks simply don't exist in the
    # signal — but each LOCKOUT is a clear top. Carve the spans between
    # consecutive tops and take each span's minimum as its bottom
    # (deadlift_conv__1koke0d: tops at the two lockouts, one wrist bottom ->
    # 0 reps bottoms-driven, recoverable tops-driven).
    if lift == "deadlift" and not reps and rom >= ROM_MIN and len(tops) >= 1:
        edges = [0, *map(int, tops), n - 1]
        synth = []
        for a, bnd in zip(edges, edges[1:]):
            if bnd - a < int(fps * 1.0):
                continue
            synth.append(a + int(np.argmin(up[a:bnd + 1])))
        if synth:
            reps3 = _build_reps(np.array(sorted(set(synth)), dtype=int), tops)
            if len(reps3) > 0:
                if os.environ.get("SEG_DEBUG"):
                    print(f"[seg] top-driven fallback adopted: {len(reps3)} reps")
                reps = reps3

    reps = _drop_bogus_reps(reps, lift)
    for i, r in enumerate(reps, 1):
        r["index"] = i
    view, view_ratio = _classify_view(B, real_frames, lift)
    summary = _effort_and_form(reps, B, torso, up, barX, fps, lift,
                               coverage=track.coverage, view=view)
    summary["cameraView"] = view
    summary["cameraViewRatio"] = view_ratio

    # Overlay path. For BENCH and DEADLIFT the hands grip the bar rigidly, so
    # the wrist midpoint is a clean, deterministic bar path — render that. The
    # plate tracker's horizontal position jitters between plate/collar/sleeve and
    # renders as a scribble even when its vertical signal is good enough for the
    # rep analysis above. Only SQUAT keeps the analysed plate path (the bar rides
    # on the back, off the hands, so the wrist isn't the bar there).
    if lift in ("bench", "deadlift"):
        lw, rw = B.j(P.L_WR), B.j(P.R_WR)
        vl, vr = B.vis[:, P.L_WR : P.L_WR + 1], B.vis[:, P.R_WR : P.R_WR + 1]
        s = vl + vr
        bz = s < 0.05
        wr_iso = np.where(
            bz, B.best(P.L_WR, P.R_WR), (lw * vl + rw * vr) / np.where(bz, 1.0, s)
        )
        wr_iso = _finite_fill(wr_iso)
        rx = _heavy_smooth(wr_iso[:, 0], fps)   # kill horizontal jitter (scribble)
        ry = _clean_signal(wr_iso[:, 1], fps)   # keep the vertical rep motion
        path_px = np.column_stack([(rx / aspect) * w, ry * h])
        # Draw ONE representative rep (top → chest → lockout), not the whole
        # set: a side-view bar path is genuinely diagonal (bar tracks back over
        # the face), so overlaying every rep + the unrack/re-rack sweeps stacks
        # into a tangle. A single rep is one clean arc — what lifters expect.
        if reps:
            rep = reps[len(reps) // 2]
            f0 = max(0, int(rep["phases"]["descent"][0] * fps))
            f1 = min(n - 1, int(round(rep["phases"]["press"][1] * fps)))
            if f1 - f0 >= 3:
                path_px = path_px[f0 : f1 + 1]
        else:
            # No clean reps to slice to. The whole-clip wrist path (walk-up,
            # setup, re-grip, drop) renders as a scribble — instead show only the
            # single biggest pull: the lowest bar point (floor) -> the highest
            # point reached after it (lockout). That is the clean near-vertical
            # line a deadlift bar path should be, even when reps weren't isolated.
            lo = int(np.argmax(ry))                     # floor = lowest bar (max y)
            hi = (lo + int(np.argmin(ry[lo:]))) if lo < n - 1 else lo
            if hi - lo >= 3:
                path_px = path_px[lo : hi + 1]
        overlay = _render_overlay(track, path_px, 0.0)
    else:
        path_px = np.column_stack([(barX / aspect) * w, (-up) * h])
        overlay = _render_overlay(track, path_px, plate_r if bar_source == "plate" else 0.0)

    if bar_source == "wrist" and lift == "squat":
        warnings.append(
            "Couldn't lock the plate near the hands — fell back to wrist "
            "tracking, which is less accurate. Keep the bar/plate clearly lit "
            "and in frame."
        )
    if not reps:
        # Framing advice is per-lift: a deadlift/squat is filmed standing (no
        # "foot of the bench", no rack), so the bench wording would be wrong.
        if lift == "bench":
            frame_hint = ("film from the side or foot of the bench with the whole "
                          "body and the full press (unrack -> re-rack) in frame")
            full_lift = "the whole press (unrack -> re-rack)"
        elif lift == "deadlift":
            frame_hint = ("film from the side with the whole body and the full "
                          "pull (floor to lockout) in frame")
            full_lift = "the whole pull (floor to lockout)"
        else:  # squat
            frame_hint = ("film from the side with the whole body and the full "
                          "squat (top to bottom to top) in frame")
            full_lift = "the whole squat"
        if track.coverage < 0.5:
            warnings.append(
                "Couldn't read clean reps — the lifter was only tracked in "
                f"{round(track.coverage * 100)}% of frames. Best results: "
                f"{frame_hint}, well lit and steady."
            )
        else:
            warnings.append(
                "Tracked the lifter but couldn't isolate distinct reps — make "
                f"sure {full_lift} is in frame."
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


def _classify_view(B: "_Body", real_frames: np.ndarray, lift: str = "bench") -> tuple[str, float]:
    """side vs nonside camera. Lateral-geometry checks (bar drift, wrist
    stacking, bar-over-midfoot, depth) are only trustworthy side-on — running
    them anyway produced confidently WRONG advice (ANALYSIS.md F9). Front vs
    rear needs face keypoints the current track doesn't carry — P2.

    BENCH: shoulder separation is degenerate (keypoints scrunch on a
    foreshortened lying body), but the torso AXIS tells the story: a side
    camera sees the lying torso horizontal in the image; a head-on/foot
    camera sees it pointing into the lens (near-vertical, short projection).
    SQUAT/DEADLIFT (standing): side cameras stack the shoulders (small
    separation vs torso); front/rear show full shoulder width."""
    sh = (B.xy[:, P.L_SH, :] + B.xy[:, P.R_SH, :]) / 2.0
    hp = (B.xy[:, P.L_HIP, :] + B.xy[:, P.R_HIP, :]) / 2.0
    vis_ok = ((B.vis[:, P.L_SH] > 0.2) & (B.vis[:, P.R_SH] > 0.2)
              & real_frames[: B.n])
    if vis_ok.sum() < 4:
        return "unknown", float("nan")
    torso = float(np.nanmedian(np.linalg.norm(sh - hp, axis=1))) or 0.2
    if lift == "bench":
        dx = np.abs(sh[:, 0] - hp[:, 0])
        dy = np.abs(sh[:, 1] - hp[:, 1])
        horiz = dx / (dx + dy + 1e-6)
        ratio = float(np.median(horiz[vis_ok]))
        return ("side" if ratio >= 0.45 else "nonside"), round(ratio, 3)
    sep = np.linalg.norm(B.xy[:, P.L_SH, :] - B.xy[:, P.R_SH, :], axis=1)
    ratio = float(np.median(sep[vis_ok])) / torso
    return ("side" if ratio < 0.35 else "nonside"), round(ratio, 3)


ABSTAIN_NOTE = ("Some checks were skipped — they need a side-on camera. "
                "Film from the side for the full read.")


def _bench_notes(reps, hip_stab, shoulder_stab, foot_mv, view="side", coverage=1.0) -> tuple[list[str], str]:
    notes: list[str] = []
    flares = [r["elbowFlareDeg"] for r in reps if r["elbowFlareDeg"] is not None]
    if flares:
        mf = float(np.mean(flares))
        if mf > 80:
            notes.append(f"Elbows flaring (~{mf:.0f} deg from torso) — tuck toward 45-75 deg.")
        elif mf < 40:
            notes.append(f"Elbows very tucked (~{mf:.0f} deg) — watch the bar drifting low to the belly.")
        else:
            notes.append(f"Elbow tuck ~{mf:.0f} deg from torso — in the healthy 45-75 deg range.")
    # Touch-and-go / pause read (F10): pauseS is measured every rep; surface
    # it. The most-upvoted advice on the meet-prep clip was exactly this.
    tng = [r for r in reps if r.get("touchAndGo")]
    if len(tng) >= max(1, len(reps) // 2):
        notes.append(
            "Touch-and-go — no visible pause on the chest. If you compete, "
            "practice a motionless pause; meets require one."
        )
    fast_desc = [r for r in reps if r["descentS"] < 0.3 and not r.get("touchAndGo")]
    if len(fast_desc) >= max(1, len(reps) // 2):
        notes.append("Descent is fast — control the bar down; don't bounce it off the chest.")

    if view == "side":
        # Lateral FAULT calls need solid tracking: at <70% coverage the
        # x-geometry wobble is the tracker's, not the lifter's (invented
        # wrist/leverage faults on a praise clip at 57% cov). Positive reads
        # are kept — a false "good" is far cheaper than a false fault.
        mw = float(np.mean([r["wristAheadOfElbowTorso"] for r in reps]))
        if abs(mw) > 0.15 and coverage >= 0.7:
            where = "ahead of (toward the feet)" if mw > 0 else "behind"
            notes.append(
                f"Bar/wrist sits {where} the elbow at the chest (~{abs(mw):.2f} torso) — "
                "stack wrist over elbow or it becomes a front-delt raise."
            )
        elif abs(mw) <= 0.15:
            notes.append("Wrist stays stacked over the elbow at the chest — good.")
        toward = float(np.mean([r["towardShoulderTorso"] for r in reps]))
        if toward > 0.04:
            notes.append("Bar curves back over the shoulders on the press — J-curve, good leverage.")
        elif toward < -0.04 and coverage >= 0.7:
            notes.append("Bar drifts AWAY from the shoulders on the press — poor leverage.")
        elif -0.04 <= toward <= 0.04:
            notes.append("Bar presses nearly straight up — little J-curve; expect a harder lockout.")
    # Stability notes need trustworthy tracking: at low coverage the wobble is
    # the TRACKER's, not the lifter's (they invented 3 faults on a praise clip
    # at 57% cov — ANALYSIS.md). Only emit when the pose is solid.
    # Hip/shoulder/foot "stability" from pose keypoints is noise-dominated on
    # bench: a consensus-praised clip measured foot=0.47 torso while a clip
    # whose coaches flagged real foot-shuffling measured 0.09 — the metric
    # ordering is inverted by ankle/hip keypoint wobble at bench camera
    # angles. Same conclusion squat/DL reached long ago. The raw numbers stay
    # in the summary as data; the coach voice does NOT claim them.
    if view == "side":
        drift = float(np.mean([abs(r["barDriftTorso"]) for r in reps]))
        curve = float(np.mean([r["curveRatio"] for r in reps]))
        bar_note = (
            f"Bench bar path is {'a clear curve' if curve > 0.15 else 'nearly straight'} "
            f"(horizontal travel ~{drift:.2f} torso on the press)."
        )
    else:
        bar_note = "Bar path read needs a side-on camera."
        notes.append(ABSTAIN_NOTE)
    return notes, bar_note


def _squat_notes(reps, hip_stab, foot_mv, view="side", coverage=1.0) -> tuple[list[str], str]:
    notes: list[str] = []
    abstained = False
    # Depth (hip-below-knee) is a SIDE-view read: from the rear the hip
    # keypoint sits at sacrum height and parallax hides true depth — the
    # engine confidently praised depth on a rear-view clip whose consensus
    # was a depth FAIL (F9). Say nothing rather than the wrong thing.
    if view == "side":
        depths = [r["depthHipMinusKneeTorso"] for r in reps]
        md = float(np.mean(depths))
        if md > 0.03:
            notes.append(f"Depth is below parallel ({md:+.2f} torso hip-below-knee) — good.")
        elif md > -0.03:
            notes.append("Hitting roughly parallel — borderline for comp depth.")
        else:
            notes.append(f"Squat is high — hip stays above the knee ({md:+.2f} torso). Drop deeper.")
    else:
        abstained = True
    # Knee tracking (valgus) is the OPPOSITE: it lives in the frontal plane,
    # so it's only readable from a front/rear camera — a side view stacks
    # knee and ankle in depth and the x-difference is noise.
    if view == "nonside":
        knees = [r["kneeVsAnkleTorso"] for r in reps]
        mk = float(np.mean(knees))
        if mk < -0.05:
            notes.append(
                f"Knees collapse inward at the bottom (~{abs(mk):.2f} torso inside the ankle) — "
                "drive knees out in the direction of the toes."
            )
        elif mk > 0.18:
            notes.append("Knees track well outboard of the ankles — good.")
        else:
            notes.append("Knees track in line with the toes — good.")
    if view == "side":
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
    if abstained:
        notes.append(ABSTAIN_NOTE)
    bar_note = (f"Squat ROM ~{rom:.2f} torso." if view != "side"
                else f"Squat bar path: ~{float(np.mean([abs(r['barDriftTorso']) for r in reps])):.2f} "
                     f"torso horizontal drift, ROM ~{rom:.2f} torso.")
    return notes, bar_note


def _deadlift_notes(reps, hip_stab, foot_mv, view="side", coverage=1.0) -> tuple[list[str], str]:
    notes: list[str] = []
    # Bar-over-midfoot is sagittal-plane geometry — side view only. Running
    # it from a rear camera invented a setup fault on a clip whose consensus
    # was "perfect form" (F9).
    if view == "side":
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
    if view == "side":
        drift = float(np.mean([abs(r["barDriftTorso"]) for r in reps]))
        if drift > 0.20:
            notes.append(
                f"Bar swings ~{drift:.2f} torso horizontally on the pull — should be straight up "
                "the legs, dragging the shins."
            )
        # Hip-knee-ankle lockout angle is a sagittal read too — from the rear
        # all three stack vertically and the angle is always ~180.
        locks = [r["lockoutHipKneeAnkleDeg"] for r in reps if r["lockoutHipKneeAnkleDeg"] is not None]
        if locks:
            ml = float(np.mean(locks))
            if ml < 160:
                notes.append(f"Lockout hip/knee not fully extended (~{ml:.0f} deg) — squeeze glutes; stand tall.")
            else:
                notes.append(f"Strong lockout — hip/knee ~{ml:.0f} deg.")
    else:
        notes.append(ABSTAIN_NOTE)
    # 'feet shift' from pose is unreliable (ankle landmarks wobble even when
    # the lifter is rock-steady) — don't emit it.
    rom = float(np.mean([r["romTorso"] for r in reps]))
    bar_note = (f"Deadlift ROM ~{rom:.2f} torso." if view != "side"
                else f"Deadlift bar path: ~{float(np.mean([abs(r['barDriftTorso']) for r in reps])):.2f} "
                     f"torso horizontal drift, ROM ~{rom:.2f} torso.")
    return notes, bar_note


def _drop_bogus_reps(reps: list[dict], lift: str) -> list[dict]:
    """Remove segments that can't be real reps before they poison the effort
    read: a collapsed/partial ROM, or an impossibly fast concentric (a pose
    teleport, e.g. a 1.9-torso press in 0.37 s). Keep the original list if
    filtering would leave fewer than two reps — better a rough read than none."""
    if len(reps) <= 2:
        return reps
    rom = np.array([r["romTorso"] for r in reps], dtype=float)
    conc = np.array([max(1e-3, r["concentricS"]) for r in reps], dtype=float)
    vel = rom / conc
    med_rom = float(np.median(rom)) or 1e-6
    med_vel = float(np.median(vel)) or 1e-6
    kept = [
        r for r, rr, vv in zip(reps, rom, vel)
        if rr >= 0.5 * med_rom and vv <= 2.2 * med_vel
    ]
    if len(kept) < 2:
        kept = list(reps)
    # Trim leading unrack/settle "reps" (BENCH only — a deadlift legitimately
    # starts from the floor with no eccentric). On bench the unrack produces a
    # leading segment with a near-zero descent (and an oversized rise as the
    # bar drops from the rack); it reads as a fast, fresh rep and fakes a big
    # velocity loss, so drop those off the front.
    if lift == "bench":
        med_desc = float(np.median([r["descentS"] for r in kept])) or 1e-6
        while len(kept) > 2 and kept[0]["descentS"] < 0.4 * med_desc:
            kept.pop(0)
    return kept


def _effort_and_form(reps, B: _Body, torso, up, barX, fps, lift, coverage=1.0,
                     view="side") -> dict:
    if not reps:
        return {
            "repCount": 0,
            "rir": None,
            "rpe": None,
            "rpeBand": None,
            "rpeConfidence": "rough",
            "velocityLossPct": None,
            "barPathNote": "No reps segmented.",
            "formNotes": [],
        }

    # Effort = velocity loss across the set. Per-rep MEAN CONCENTRIC VELOCITY
    # uses the press rise (chest -> lockout), NOT the full-span ROM: the span
    # of the first reps absorbs the unrack travel, which made them look huge
    # and fast and faked a big velocity loss. Compare the grindiest rep to a
    # robust "fresh" speed (75th pct, so one teleport-fast frame can't define
    # the baseline). Bogus reps were already dropped upstream.
    times = [r["concentricS"] for r in reps]
    vels = [max(1e-4, r.get("concRiseTorso", r["romTorso"])) / max(1e-3, r["concentricS"])
            for r in reps]
    t_fast = min(times)
    # Median = the lifter's typical fresh rep speed; robust to one teleport-fast
    # frame or a surviving unrack rep defining the baseline.
    v_fresh = float(np.median(vels)) or 1e-6
    v_grind = float(min(vels))
    v_last = vels[-1]
    # Blend the slowest rep and the last rep: a set that ENDS grinding and one
    # whose hardest rep was mid-set both signal fatigue, but the last rep is
    # the truest proximity-to-failure cue.
    v_end = min(v_last, 0.5 * (v_grind + v_last))

    # Velocity loss needs at least 3 reps to read a real slowdown TREND. With
    # 1-2 reps a near-zero loss is ambiguous — it's either a genuinely fresh
    # light set OR a heavy near-max single/double where every rep is maximal
    # (no loss but high RPE), and bar speed alone can't tell them apart without
    # the load. Report no loss so the caller falls back to a wide, honest band
    # instead of confidently calling a grind "fresh".
    rpe_band = None
    if len(reps) >= 3:
        loss = max(0.0, (1.0 - v_end / v_fresh) * 100.0)
        rir = _rir_from_loss(loss, lift)
        rpe = max(4.0, min(10.0, round((10.0 - rir) * 2) / 2))
        # A clean, well-covered set earns "estimated"; sparse pose stays "rough".
        conf = "estimated" if coverage >= 0.7 else "rough"
    elif coverage >= 0.5:
        # 1-2 rep set (F3): velocity LOSS is undefined, but concentric
        # DURATION still separates a crisp opener from a grinder — a maximal
        # bench single grinds for seconds, a fast single is several RIR. Wide
        # honest band, never null on a set we actually tracked. Squat/DL
        # concentrics run ~1.5x longer at the same proximity to failure.
        loss = None
        slowest = max(times) / (1.0 if lift == "bench" else 1.5)
        # Band edges: a sub-0.8s bench single is crisp (several RIR); past
        # ~1s of concentric on a single the bar is visibly grinding (the
        # 135kg meet-prep single: 1.23s, called ~9.5 by an experienced
        # commenter); multi-second singles are limit attempts.
        for hi_t, band in ((0.8, (6.0, 8.0)), (2.0, (8.0, 9.5)),
                           (4.0, (8.5, 10.0)), (float("inf"), (9.0, 10.0))):
            if slowest <= hi_t:
                rpe_band = list(band)
                break
        rpe = round((rpe_band[0] + rpe_band[1]) / 2 * 2) / 2 if rpe_band else None
        rir = round(10.0 - rpe, 1) if rpe is not None else None
        conf = "rough"
    else:
        loss = None
        rir = None
        rpe = None
        conf = "rough"

    # The wall: first rep that abruptly slows vs the fresh speed.
    wall = None
    for i in range(1, len(reps)):
        if vels[i] < 0.7 * v_fresh and vels[i] < 0.75 * vels[i - 1]:
            wall = reps[i]["index"]
            break

    for r in reps:
        r["slowdownVsFastestPct"] = round((1.0 - t_fast / r["concentricS"]) * 100.0, 1)

    # Stability is judged INSIDE the reps only: whole-clip std absorbs the
    # setup, unrack, re-rack and rest shuffles and faulted praise clips.
    sh = B.mid(P.L_SH, P.R_SH)
    hip = B.mid(P.L_HIP, P.R_HIP)
    ank = B.mid(P.L_AN, P.R_AN)
    mask = np.zeros(B.n, dtype=bool)
    for r in reps:
        f0 = int(r["phases"]["descent"][0] * fps)
        f1 = min(B.n - 1, int(r["phases"]["press"][1] * fps))
        mask[max(0, f0):f1 + 1] = True
    if mask.sum() < 8:
        mask[:] = True
    shoulder_stability = float(np.std(-sh[mask, 1]) / torso)
    hip_stability = float(np.std(-hip[mask, 1]) / torso)
    foot_movement = float(np.std(ank[mask, 0]) / torso + np.std(ank[mask, 1]) / torso)

    if lift == "bench":
        notes, bar_note = _bench_notes(reps, hip_stability, shoulder_stability,
                                       foot_movement, view=view, coverage=coverage)
    elif lift == "squat":
        notes, bar_note = _squat_notes(reps, hip_stability, foot_movement,
                                       view=view, coverage=coverage)
    else:  # deadlift
        notes, bar_note = _deadlift_notes(reps, hip_stability, foot_movement,
                                          view=view, coverage=coverage)

    return {
        "repCount": len(reps),
        "firstRepConcentricS": round(times[0], 3),
        "fastestRepConcentricS": round(t_fast, 3),
        "lastRepConcentricS": round(times[-1], 3),
        "rpeBand": rpe_band,
        "velocityLossPct": None if loss is None else round(loss, 1),
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

    # skeleton — skip joints interpolated over detection gaps (vis < 0.2);
    # drawing them produces physically impossible splayed-limb artefacts.
    for a, b in _SKELETON:
        if track.vis[mid, a] < 0.2 or track.vis[mid, b] < 0.2:
            continue
        pa = (int(track.xy[mid, a, 0] * w), int(track.xy[mid, a, 1] * h))
        pb = (int(track.xy[mid, b, 0] * w), int(track.xy[mid, b, 1] * h))
        cv2.line(img, pa, pb, (0, 220, 120), 2)
    for i in P.KEYPOINTS:
        if track.vis[mid, i] < 0.2:
            continue
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
