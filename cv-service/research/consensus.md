# Reddit r/formcheck coaching consensus per clip (grading rubric)

Distilled from top-level comments in `manifest.json`. These are the human
coaching points the pipeline's advice is graded against. "Detectable?" =
could the fault in principle be read from a 2D pose track + bar path.

## Bench

### bench__1k74bhj — "Bench seriously lags" (13s, 162 comments)
- Lying FLAT on the bench: no arch, no scapular retraction (dominant point). Detectable: partially (torso line vs bench, shoulder y-position).
- Setup is the problem, not the press itself.
- Programming/diet advice (out of CV scope).

### bench__1kp9loz — "135kg, 1 week out" (13s, 61 comments)
- TOUCH-AND-GO: no pause on chest; comps require a pause (dominant point, multiple elite lifters). Detectable: YES — pauseS ~0 at the chest.
- Feet shuffling during/after lift-off. Detectable: YES — foot movement.
- ~RPE 9.5 per a commenter ("9.5 RPE is pretty heavy... within a week"). RPE ground truth.

### bench__1jzn2i2 — "Bench press skill issue?" (12s, 14 comments)
- Form basically fine ("form looks good", "form is ok") — engine must not invent major faults.
- Shoulders come OFF the bench at unrack (scap retraction lost). Detectable: partially.
- Feet/legs move a lot — no stability from tucked feet position; put feet flat. Detectable: YES — footMovement.
- Descent too fast — slow down. Detectable: YES — descentS.

### bench_close__c8v58n — close grip, comp arch (35s, 11 comments)
- Form solid; wrists fine; bar path good (consensus praise). Engine must not invent faults.
- Rack height a hair too high (loses arch clearing the pin) — setup, pre-rep. Detectable: marginal.
- Improve leg drive. Detectable: partial (foot/hip cues).
- CAMERA: head-on down the bench — side-view geometry mostly unavailable.

### bench_wide__bl06xu — wide grip AMRAP (31s, 3 comments)
- "Looks good; AMRAP at low weight won't show form breakdown." Praise clip.
- CAMERA: dark, far, low contrast.

## Squat

### squat_highbar__1kaqgmw — "knees out cue?" (63s, 70 comments)
- KNEE VALGUS / knees cave hard (dominant; "knees almost touching"). Detectable: YES from front view — kneeVsAnkle (but clip has a MID-CLIP CAMERA CUT front→rear-close).
- Limited ankle mobility limits depth; toes out more. Detectable: partial (shin angle).
- One informed dissent: valgus out of the hole is fine/normal.

### squat_highbar__1kovzbg — "back after time off" (46s, 10 comments)
- STOP initiating with hips / excessive lower-back arch (dominant). Detectable: YES — hip-first descent, hip vs knee break order.
- Break at knees and hinge naturally.

### squat_lowbar__1kn0yi5 — long femur, new shoes (38s, 43 comments)
- Feet/balance unstable, swaying (dominant). Detectable: partial — ankle x wobble (engine deliberately doesn't emit foot-shift).
- Hinge MORE — chest too upright for low bar (style-specific: low bar wants forward lean!). Detectable: YES — torso angle, but requires LOW-BAR-AWARE thresholds.
- Gaze down / neck-upper back rounding — raise gaze. Detectable: partial (nose vs shoulder line).

### squat_lowbar__1gkk44z — "Did I hit depth?" (24s, 36 comments)
- Depth: borderline/NO by comp standards (dominant — the literal question). Detectable: YES — depthHipMinusKnee (rear-view caveat).
- Excessive forward lean / "good morning" squat; hips rise first. Detectable: YES — hipLead + torso angle.
- Elbows flared way back; gaze down. Detectable: partial.
- Wide stance for squatting. Detectable: YES — ankle spread vs shoulder width.

## Deadlift

### deadlift_conv__1kk370m — conventional form check (51s, 27 comments)
- Stance WAY too wide for conventional — narrow to hip width (dominant, score 15). Detectable: YES — ankle spread vs hip/shoulder width. ENGINE HAS NO STANCE-WIDTH CHECK.
- Bent elbows + supinated grip = bicep-tear risk; arms must hang straight (score 14). Detectable: YES — elbow angle during pull. ENGINE HAS NO ARM-SLACK CHECK.
- Too much arm tension; "push the floor" not "pull the bar". Cue-level.

### deadlift_conv__1koke0d — "Powerlifter deadlift form" (27s, 13 comments)
- Setup inconsistency: bar rolls FORWARD before the pull (hips' downward inertia); rep 3 pulled far forward and agonizing. Detectable: YES — bar x-drift pre-liftoff per rep; per-rep inconsistency.
- Otherwise strong pulls ("first rep was great").

### deadlift_sumo__1kj0keq — "Sumo deadlift check" (14s, 69 comments)
- PRAISE clip: "form has a perfect credit score", hips move correctly. Engine must not invent faults.
- Semi-sumo stance noted (stance classification).
- Rep 1: bar traveled slightly BACKWARD before going up (setup nit). Detectable: YES — bar x at liftoff.
- CAMERA: rear view.

### deadlift_sumo__1jd0wuf — sumo 123lbs (23s, 27 comments)
- Bar too far FORWARD of midfoot / not against shins (dominant). Detectable: YES — barOverMidfoot (engine HAS this check).
- Knees thrust forward, heels rise, lifting around the knees. Detectable: partial — ankle/knee geometry.
- Loses tension with pre-rep movement; back not upright in sumo setup. Detectable: partial.
- CAMERA: plate occludes lower body (like local 255lb clip).

## Cross-cutting observations

1. The single most common DOMINANT fault class across clips is SETUP/STANCE
   geometry (stance width, bar-over-foot at setup, rack height, arch/scap) —
   the current engine only checks bar-over-midfoot for DL.
2. Touch-and-go vs paused bench is a high-signal, trivially computable check
   (pauseS exists per rep) the engine never surfaces.
3. Style awareness matters: low bar WANTS forward lean (engine has no
   high/low-bar concept); semi-sumo vs sumo vs conventional stance
   classification gates which advice applies (wide stance = fault for conv,
   correct for sumo).
4. Praise clips are common (3/13) — a credible coach says "solid, minor nit"
   rather than inventing faults. Engine's threshold notes mostly do this
   right (emits "good" notes), but only if pose coverage is good enough.
5. RPE ground truth from comments exists but is sparse (1 clip); rep-quality
   commentary ("rep 3 agonizing") supports per-rep effort reads.
