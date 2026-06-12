# Form-check CV: detailed analysis (2026-06-11)

> **OUTCOME (2026-06-12)**: rebuild shipped. 24-clip corpus went 6 →
> **18 PASS / 5 PART / 1 FAIL** (holdout 4/5, untuned). Production backend
> = RTMPose-m (rtmlib/ONNX) with three-tier escalation, 15-37 fps CPU
> (was 0.3-3). Heavy singles read RPE 9.0 vs GT 9 instead of null;
> touch-and-go is now a coaching note, not a deleted rep; rear-view praise
> clips abstain instead of inventing faults. Squat bar = shoulder midpoint
> (CSRT retired). See the formcheck-cv-pipeline memory + sections below for
> the F1-F10 evidence this was built on.

Scope: current pipeline = YOLOv8x-pose @ imgsz 960 (pose_yolo.py) → custom
greedy track-linker + lifter selector (pose.py) → signal cleaning + rep
segmentation + threshold advice (analysis.py); CSRT plate tracker (bar.py)
for squat only. Evaluated on 11 local sample clips + 13 r/formcheck clips
across bench (regular/close/wide), squat (high/low bar), deadlift
(conventional/sumo), graded against the r/formcheck coaching consensus
(research/consensus.md).

## 1. Baseline — local sample_videos (filename = ground truth)

### Bench (5 clips)
| clip | GT RPE | RPE | reps | coverage | verdict |
|---|---|---|---|---|---|
| 135 lb RPE 6.5 | 6.5 | 5.5 | 4 | 100% | works; RPE 1.0 low |
| 150 lb RPE 6 | 6.0 | 5.5 | 3 | 100% | works; RPE 0.5 low |
| 160 kg RPE 9 | 9.0 | null | 1 | 59% | partial: lifter found, coverage too low to segment |
| 150 kg RPE 9 | 9.0 | null | 0 | 27% | BROKEN: locks onto standing spotter |
| 310 lb RPE 7 | 7.0 | null | 0 | 29% | BROKEN: foreground plate occludes lifter |

### Deadlift (4 clips, no GT RPE in filenames)
| clip | RPE | reps | coverage | verdict |
|---|---|---|---|---|
| 155 lb | 5.5 | 4 | 100% | works |
| 290 lb | 6.0 | 3 | 74% | works, patchy (skeleton gaps) |
| 225 lb | 6.0 | 3 | 63% | partial |
| 255 lb | null | 2 | 43% | broken-ish: plate occlusion, wrist path scribble |

### Squat (2 clips) — 0/2, both broken, in two different ways
| clip | RPE | reps | coverage | verdict |
|---|---|---|---|---|
| 315 lb | null | 0 | 98% (good) | BROKEN: pose is perfect; CSRT locked a STATIONARY rack plate → bar signal has ~no vertical ROM → every rep rejected |
| 145 lb | null | 0 | 38% (low) | BROKEN: track fragmentation in the rack |

The 315 lb case is the purest indictment of the plate tracker: with a clean
98%-coverage skeleton, the analysis still returns nothing because bar.py
chose a plate that never moves. (See F7.)

Latency (CPU, yolov8x@960 + crop re-pass): bench 2–6 min/clip, deadlift
11–31 min/clip, squat 11–32 min/clip. Deploy target is GPU, but even so this model+resolution
choice is the dominant cost. The user-perceived ranking
(bench > deadlift > squat) matches measurements.

## 2. Reddit r/formcheck evaluation (13 clips, 7 categories)

### Deadlift (4 clips)
| clip | consensus | cov | reps | RPE | verdict |
|---|---|---|---|---|---|
| conv__1kk370m (wide stance) | stance too wide; bent elbows | 100% | 4 | 7.0 | tracked+segmented ✓ — advice grading pending |
| conv__1koke0d (clean side view) | bar rolls forward at setup; rep 3 grinder | 82% | 0 | null | BROKEN: skeleton verified on-lifter all 3 panels, segmentation returned nothing (see F8) |
| sumo__1kj0keq (rear, praise clip) | "perfect credit score" | 100% | 2 | null | partial: tracked, reps undercounted vs comments, RPE null (<3 reps = F3) |
| sumo__1jd0wuf (plate occlusion) | bar too far forward | 41% | 0 | null | BROKEN: occlusion fragmentation (F1) |

### Bench (5 clips)
| clip | consensus | cov | reps | RPE | verdict |
|---|---|---|---|---|---|
| bench__1k74bhj (lagging bench) | flat on bench, no arch/scap | 100% | 4 | 6.5 | tracked+segmented ✓ |
| bench__1jzn2i2 (form-fine clip) | form fine; feet move; fast descent | 100% | 0 | null | BROKEN: clean side view, full coverage, segmentation returned nothing |
| bench__1kp9loz (135kg meet prep) | touch-and-go; ~RPE 9.5 | 100% | 0 | null | BROKEN: heavy single/double — the highest-value read — returns nothing (F3) |
| bench_close__c8v58n (head-on cam) | solid; rack height nit | 57% | 3 | 5.0 | partial: segments despite head-on angle |
| bench_wide__bl06xu (dark, far) | looks good (AMRAP) | 43% | 0 | null | BROKEN: tracking fragmentation (F1) |

### Squat (4 clips)
| clip | consensus | cov | reps | RPE | verdict |
|---|---|---|---|---|---|
| lowbar__1gkk44z ("Did I hit depth?", rear) | depth borderline-no; good-morning lean | 96% | 1 | null | partial: 1 rep segmented → some advice generated |
| lowbar__1kn0yi5 (long femur) | unstable feet; hinge more | 100% | 0 | null | BROKEN: full coverage, plate-sourced bar signal flat (F7) |
| highbar__1kaqgmw (camera cut mid-clip) | knee valgus | 50% | 0 | null | BROKEN: mid-clip cut breaks single-camera assumption silently |
| highbar__1kovzbg (far, busy gym) | hip-first initiation; back arch | 41% | 0 | null | BROKEN: fragmentation (F1) |

### Combined scoreboard (24 clips: 11 local + 13 Reddit)
| lift | full | partial | broken |
|---|---|---|---|
| bench (10) | 3 | 2 | 5 |
| deadlift (8) | 3 | 2 | 3 |
| squat (6) | 0 | 1 | 5 |

User-perceived ranking bench > deadlift > squat CONFIRMED quantitatively.
Critical pattern: 5 of the 13 broken clips have ≥82% pose coverage — the
model is NOT the bottleneck on those; segmentation gates and the squat
plate tracker are.

### Advice quality vs r/formcheck consensus (the 5 clips that produced advice)
| clip | consensus headline | engine said | grade |
|---|---|---|---|
| bench__1k74bhj | flat on bench: no arch / no scap retraction | elbow flare 109°, wrist ahead, hips/shoulders/feet move | PARTIAL: plausible proxies, headline unsaid (no arch/scap check exists) |
| bench_close__c8v58n (praise, head-on cam) | solid; rack-height nit | tuck 41° healthy ✓; J-curve ✓; but wrist-behind-elbow + hips/shoulders/feet faults | MIXED: 2 matches, 3+ likely-invented faults (57% cov + head-on geometry, F9) |
| deadlift_conv__1kk370m | stance WAY too wide (15↑); bent elbows = bicep risk (14↑) | bar forward of midfoot; shoulders-first; bar swings; lockout ✓ | MISS: both headline faults unchecked (F4); bar-forward note possibly a wide-stance artifact |
| deadlift_sumo__1kj0keq (praise, rear cam) | "perfect credit score" | bar 0.49 torso forward of midfoot (!); lockout ✓ | INVENTED FAULT from rear-view geometry (F9); RPE null on readable 2-rep set (F3) |
| squat_lowbar__1gkk44z (rear cam) | depth borderline-FAIL; good-morning lean | "depth below parallel — good"; valgus note | CONTRADICTS consensus on the literal question asked; headline lean missed (F9) |

Headline-match rate: 0/5. Invented-fault rate on praise clips: 2/2 that
produced advice. The engine's notes are not wrong everywhere — lockout
angles, J-curve, tuck-for-close-grip matched — but it never says the thing
the human coaches actually led with, because (a) the most common consensus
faults have no corresponding check (F4) and (b) checks run on camera angles
where their geometry is invalid (F9).

## 3. Root-cause analysis of the failure modes

### F1. Track fragmentation under occlusion/flicker (THE core defect)
pose.py:select_lifter_track links per-frame YOLO detections greedily by
centroid distance (gate 0.12·(1+gap)) and area ratio. When the lifter
flickers out (plate occlusion, motion blur, person crossing), the track dies
after max_gap (~0.7 s) and a NEW track starts; presence/min_count gates then
reject all fragments → coverage collapses (310lb 29%, 255lb DL 43%) → rep
segmentation starves. There is no appearance/IoU re-identification: this is
exactly what ByteTrack/BoT-SORT solve, and ultralytics ships both behind
`model.track(persist=True)` for pose checkpoints.

### F2. Spotter/bystander mis-selection (bench)
The bench gate accepts a track if it is lying (med_horiz ≥ 0.30) OR its
wrists travel vertically (wrist_range ≥ 0.06 AND area ≥ 0.12) OR press_frac
≥ 0.4. A spotter leaning over the bar during a heavy single (150 kg RPE 9)
moves their wrists vertically THROUGH the lift window and stands close
enough to be big in frame — they pass the OR-gate and outscore the
fragmented true-lifter track. Per-frame "who is it" heuristics cannot fix
this; stable track identity + per-track features (lying duration, bar
proximity) can.

### F3. RPE systematically null exactly when it matters
Velocity-loss → RIR needs ≥ 3 segmented reps. Heavy sets (RPE 9 singles/
doubles/triples) are the ones users most want read, and they are also the
ones with spotters hovering (F2) and grindy part-reps. Both RPE-9 bench
clips return null. Architecture note: this is not only a coverage problem —
1–2-rep sets need a *load-independent* effort model (concentric time, bar
speed profile shape, sticking-point dwell), not just set-level velocity loss.

### F4. The advice engine is style-blind and setup-blind
Graded against r/formcheck consensus (research/consensus.md):
- No stance-width check (conv DL clip's #1 comment, score 15: "stance
  insanely wide... narrow to hip width"). Computable: ankle spread / hip
  width — keypoints already exist.
- No arm-slack/bent-elbow check at DL setup (#2 comment, score 14: "going to
  tear a bicep"). Computable: elbow angle during pull.
- No touch-and-go vs paused detection for bench (dominant comment on the
  135kg meet-prep clip). pauseS is ALREADY measured per rep — never surfaced.
- No grip-width read (close/wide bench identical advice). Computable: wrist
  x-spread vs shoulder width at lockout.
- No high-bar/low-bar awareness: low-bar WANTS forward lean + hip hinge
  (consensus told the long-femur lifter to hinge MORE); the engine's only
  torso cue is hip-shoots-up. High/low-bar classification from bar-position
  (wrist height at rack position vs shoulder) is feasible but secondary.
- No conventional/sumo classification: wide stance is a fault in conv and
  correct in sumo — without classifying stance, the engine cannot say either.
- No gaze/neck cue (nose/eye keypoints exist in COCO-17 but are dropped by
  COCO_TO_BP mapping).
- No heel-rise/balance read (needs foot keypoints — COCO-17 has only ankles;
  RTMPose Halpe-26 adds heels+toes).

### F5. Squat is the weakest lift for structural reasons
The bar is on the back: wrist ≠ bar (CSRT plate tracker is the fallback and
per the failure-modes memory it is dead weight), the torso is upright(ish)
so the horiz gate is brittle mid-rep, and depth judging needs precise hip/
knee y at the turnaround — exactly where occlusion (rack uprights, plates)
and motion blur peak. Camera diversity on r/formcheck (rear view, mid-clip
cuts) breaks the side-view geometry assumptions silently.

### F7. Squat plate tracker locks stationary rack plates (315 lb proof)
bar.py validates the plate by wrist proximity + smoothness — but a RACK
plate next to the lifter's hands satisfies both (it is near the hands at
rack height and perfectly smooth because it never moves). A working-plate
gate must require the candidate's VERTICAL TRAVEL to correlate with the
wrist/shoulder vertical signal over the clip, or the plate tracker should be
replaced outright (e.g. barbell-end detection, or shoulder-line as bar proxy
for squat — the bar rides ON the shoulders, so the shoulder midpoint IS the
bar height up to neck thickness).

### F1b. Gap interpolation manufactures impossible rep candidates (confirmed)
pose.py linearly interpolates xy across undetected gaps. On fragmented
tracks (41–50% cov) SEG_DEBUG shows every rep candidate with desc≈0.10s and
conc 0.13–0.50s — teleport kinematics created BY the interpolation, then
correctly rejected by the per-lift gates. Net effect: fragmentation doesn't
just lose frames, it synthesizes fake motion that guarantees 0 reps.
Interpolated samples must be excluded from segmentation (vis-aware), or
tracking must be good enough that long gaps don't exist.

### F7 — CONFIRMED: squat_lowbar__1kn0yi5 (100% cov) logs
`[seg] REJECT-ALL rom=0.027 < ROM_MIN=0.08` — the plate signal is flat
because CSRT locked a stationary plate, while the skeleton tracked the
whole set perfectly.

### CORRECTIONS (post-P1, 2026-06-12)
- bench_close__c8v58n is a SIDE view (torso horiz 0.874) — the "head-on"
  tag from the contact sheet was wrong. Its invented faults were noise at
  57% coverage + variation-blindness (arched close-grip reduces press-back
  by design), fixed by coverage-gating lateral fault notes.
- NEW F2b: the squat selector's upright gate (HORIZ_UPRIGHT=0.35) rejects a
  heavily-leaned low-bar squatter (squat_lowbar__1kn0yi5) and falls back to
  a STATIONARY BYSTANDER at 100% "coverage" (track centroid x≈0.15, shoulder
  y-range 0.012). Same bug class as the fixed deadlift gate. Fix in P2
  selector rewrite: motion term (shoulder y-range) + looser horiz for squat.
- P1 RESULT: Reddit tuning set 8 PASS / 2 PART (both PART = tracking layer:
  41% cov fragmentation, F2b mis-selection). Was ~2 working pre-P1.

### F9. Camera-angle blindness produces confidently WRONG advice (confirmed)
The single squat clip that generated advice (lowbar__1gkk44z, REAR view,
96% cov): engine said "Depth is below parallel (+0.14 torso) — good";
the r/formcheck consensus (and the literal point of the post) was that
depth was borderline-FAIL. It also missed the consensus headline (good-
morning lean / hips rising first) — invisible in x from a rear camera. A
wrong "depth: good" on a depth-question clip is worse than no answer:
checks must be gated on a camera-angle classification.

### F8. Segmentation is brittle in three distinct, confirmed ways
SEG_DEBUG on the cached tracks shows three separate kill paths:
a) REP-MERGING: deadlift_conv__1koke0d (82% cov, clean side view) — three
   pulls produced ONE top peak (prom_frac=0.5 + 1.5s min-gap too coarse), so
   the single candidate had a 12.13s concentric → rejected by CONC_MAX → 0
   reps on a perfectly tracked clip.
b) FRAME-RELATIVE ROM GATE: ROM_MIN=0.08 of FRAME height in an otherwise
   body-relative pipeline (bench_wide__bl06xu rejected at rom=0.072; a
   distant lifter shrinks rom regardless of true bar travel). Should be
   torso-relative.
c) FAULT-SHAPED REPS REJECTED AS NOISE (F10, the worst one — see below).

### F10. The gates delete the very faults the product should report
bench__1jzn2i2 (100% cov): consensus = "slow down your descent" — all 4
reps rejected because measured descent 0.03–0.07s < DESC_MIN=0.12.
bench__1kp9loz (100% cov, 135kg meet-prep): consensus = "touch-and-go, no
pause — comps require a pause" — the rep rejected for desc 0.07s. In both
cases the FAULT ITSELF (uncontrolled/bounced descent) is what made the rep
"implausible" to the gate. A coach-grade system must segment these reps and
SAY "no pause / uncontrolled descent", not return silence. (Also note: the
descent walk-back measurement under-reads bouncy descents — 0.03s is not a
physical descent; measurement and gating compound.)

### F6. Latency is 1–2 orders of magnitude off product viability
yolov8x-pose @ 960 on CPU ≈ 0.7–1.5 s/frame ⇒ 2–31 min/clip (×2 with crop
re-pass). RTMPose-m (rtmlib, ONNX) ≈ 75.8 AP @ 90+ FPS on desktop CPU;
RTMO-s similar one-stage. A detector+tracker at det_frequency≈10 with pose
on every frame is the standard production pattern (rtmlib PoseTracker).

## 4. What the current engine gets RIGHT (keep)
- Wrist-line-as-bar for bench/deadlift (validated; plate tracker only for squat).
- Hampel despike → Savgol smoothing; body-relative (torso-length) units.
- Per-lift segmentation params; bogus-rep dropping; honest RPE bands and
  "rough" confidence labels (never fake precision — core product value).
- Per-lift framing warnings with actionable wording.
- The visual eval harness discipline (overlay-or-it-didn't-happen).

## 5. Recommendations (feed into /ecc:plan)
R0. QUICK WINS in analysis.py — no model change, fixes ~5 of 13 broken
    clips (the ≥82%-coverage ones), iterable for free off pose_cache:
    a) report-don't-reject: a candidate failing DESC_MIN becomes a rep
       with a "touch-and-go / uncontrolled descent" note (F10) + surface
       pause/no-pause per rep (pauseS already measured);
    b) torso-relative ROM_MIN (F8b);
    c) fix rep-merging: lower prom_frac / use per-lift adaptive prominence
       or zero-crossing segmentation on vy (F8a);
    d) vis-aware segmentation — exclude interpolated samples from peak
       finding (F1b);
    e) squat bar signal = shoulder midpoint (bar rides on the shoulders),
       demote the CSRT plate tracker to optional render-only (F7).
R1. Replace detection+linking with tracker-backed pose: ultralytics
    model.track (BoT-SORT) OR rtmlib PoseTracker; keep select-lifter logic as
    track-level scoring over stable IDs (lying-duration, bar-proximity,
    press_frac per track id).
R2. Model swap evaluation: RTMPose-m/RTMO (rtmlib, ONNX, body-26 with feet)
    vs YOLO11/26-pose vs current yolov8x — accuracy on the 24-clip corpus +
    latency on CPU and GPU. Keypoint remap layer already exists
    (COCO_TO_BP); Halpe-26 adds heel/toe + head for new checks.
R3. Camera-angle classifier (side/front/rear/diagonal) gating which checks
    run — silent geometric nonsense is worse than "can't read this from a
    rear view" honesty.
R4. Variation classifiers BEFORE advice: stance-width ratio (conv/sumo),
    grip-width ratio (close/normal/wide), bar-height (high/low bar) — then
    style-conditional thresholds.
R5. New high-value checks (all computable from existing/Halpe keypoints):
    pause detection (bench), stance width vs hip width (DL), elbow bend
    during pull (DL), heel rise (squat, needs Halpe), gaze (nose keypoint),
    bar-rolls-forward at setup (DL), per-rep consistency flag.
R6. 1–2-rep effort model: concentric-time + sticking-point dwell profile,
    explicitly banded ("heavy single, RPE 8.5–9.5") rather than null.
R7. Pose caching (research/advice_dump.py pattern) in the eval loop so
    analysis.py iteration is free; CI-style regression: 24-clip corpus with
    expected verdicts checked per change.
