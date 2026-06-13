# Graph Report - cv-service  (2026-06-13)

## Corpus Check
- 60 files · ~2,892,180 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 775 nodes · 850 edges · 51 communities (48 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3ae50ec1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]

## God Nodes (most connected - your core abstractions)
1. `analyze_lift()` - 26 edges
2. `summary` - 18 edges
3. `summary` - 18 edges
4. `summary` - 18 edges
5. `summary` - 18 edges
6. `summary` - 18 edges
7. `summary` - 18 edges
8. `summary` - 18 edges
9. `summary` - 18 edges
10. `summary` - 18 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `analyze_lift()`  [EXTRACTED]
  eval_samples.py → analysis.py
- `main()` --calls--> `analyze_lift()`  [EXTRACTED]
  research/advice_dump.py → analysis.py
- `main()` --calls--> `analyze_lift()`  [EXTRACTED]
  visual_eval.py → analysis.py
- `main()` --calls--> `track_bar()`  [EXTRACTED]
  visual_eval.py → bar.py
- `main()` --calls--> `track_pose()`  [EXTRACTED]
  eval_samples.py → pose.py

## Import Cycles
- None detected.

## Communities (51 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (46): analyze_lift(), _angle(), _bench_notes(), _Body, _classify_view(), _clean_signal(), _deadlift_notes(), _drop_bogus_reps() (+38 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (28): barSource, fps, lift, pose, coverage, detectedFrames, quality, totalFrames (+20 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (28): barSource, fps, lift, pose, coverage, detectedFrames, quality, totalFrames (+20 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (28): barSource, fps, lift, pose, coverage, detectedFrames, quality, totalFrames (+20 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (28): barSource, fps, lift, pose, coverage, detectedFrames, quality, totalFrames (+20 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (28): barSource, fps, lift, pose, coverage, detectedFrames, quality, totalFrames (+20 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (28): barSource, fps, lift, pose, coverage, detectedFrames, quality, totalFrames (+20 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (28): barSource, fps, lift, pose, coverage, detectedFrames, quality, totalFrames (+20 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (28): barSource, fps, lift, pose, coverage, detectedFrames, quality, totalFrames (+20 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (28): barSource, fps, lift, pose, coverage, detectedFrames, quality, totalFrames (+20 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (22): One-time fetch of the MediaPipe pose model (~9 MB) into models/.      python dow, _best_rotation(), _cand_wrist_y(), _candidate(), _detect_candidates(), _detect_in_region(), _lifter_crop(), _lifter_likeness() (+14 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (25): make_model(), _model(), PoseTrack, RTMPose-m backend (rtmlib, ONNX) — the P2 production pose path.  Bake-off resu, Shared PoseTracker for batch runs (ONNX sessions are reusable)., rtmlib output (N,17,2) PIXEL keypoints + (N,17) scores ->     pose.py candidate, _run_pass(), _to_candidates() (+17 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (27): 1. Baseline — local sample_videos (filename = ground truth), 2. Reddit r/formcheck evaluation (13 clips, 7 categories), 3. Root-cause analysis of the failure modes, 4. What the current engine gets RIGHT (keep), 5. Recommendations (feed into /ecc:plan), Advice quality vs r/formcheck consensus (the 5 clips that produced advice), Bench (5 clips), Bench (5 clips) (+19 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (26): barSource, fps, lift, path, pose, coverage, detectedFrames, quality (+18 more)

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (26): barSource, fps, lift, path, pose, coverage, detectedFrames, quality (+18 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (26): barSource, fps, lift, path, pose, coverage, detectedFrames, quality (+18 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (26): barSource, fps, lift, path, pose, coverage, detectedFrames, quality (+18 more)

### Community 17 - "Community 17"
Cohesion: 0.07
Nodes (26): barSource, fps, lift, path, pose, coverage, detectedFrames, quality (+18 more)

### Community 18 - "Community 18"
Cohesion: 0.13
Nodes (18): BarTrack, _hough_near(), ndarray, PoseTrack, Track the actual barbell plate — not the wrist.  Why this exists: for a side / f, A real plate moves slowly and continuously. A bad lock (CSRT bouncing     betwee, Per-frame camera-side wrist (more visible of L/R) and body scale., Hough circles inside a window around (cx,cy); centres in full coords. (+10 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (21): barSource, fps, lift, pose, coverage, detectedFrames, quality, totalFrames (+13 more)

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (21): barSource, fps, lift, pose, coverage, detectedFrames, quality, totalFrames (+13 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (21): barSource, fps, lift, pose, coverage, detectedFrames, quality, totalFrames (+13 more)

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (21): barSource, fps, lift, pose, coverage, detectedFrames, quality, totalFrames (+13 more)

### Community 23 - "Community 23"
Cohesion: 0.11
Nodes (18): Bench, bench__1jzn2i2 — "Bench press skill issue?" (12s, 14 comments), bench__1k74bhj — "Bench seriously lags" (13s, 162 comments), bench__1kp9loz — "135kg, 1 week out" (13s, 61 comments), bench_close__c8v58n — close grip, comp arch (35s, 11 comments), bench_wide__bl06xu — wide grip AMRAP (31s, 3 comments), Cross-cutting observations, Deadlift (+10 more)

### Community 24 - "Community 24"
Cohesion: 0.13
Nodes (14): [bench] bench__1jzn2i2.mp4, [bench] bench__1k74bhj.mp4, [bench] bench__1kp9loz.mp4, [bench_close] bench_close__c8v58n.mp4, [bench_wide] bench_wide__bl06xu.mp4, [deadlift_conv] deadlift_conv__1kk370m.mp4, [deadlift_conv] deadlift_conv__1koke0d.mp4, [deadlift_sumo] deadlift_sumo__1jd0wuf.mp4 (+6 more)

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (14): draw_skeleton(), fit_panel(), ground_truth_rpe(), main(), ndarray, PoseTrack, Visual eval harness for the bench form-check pipeline.  The OLD eval_samples.p, Camera-side wrist (more-visible of L/R) per frame, in pixels, plus its     visi (+6 more)

### Community 26 - "Community 26"
Cohesion: 0.36
Nodes (8): download_video(), fetch_comments(), get_json(), main(), Fetch r/formcheck test clips + coaching comments for the form-check CV eval.  Re, search_posts(), main(), Second pass: drop bad entries and fill category gaps with broader queries.  The

### Community 27 - "Community 27"
Cohesion: 0.29
Nodes (6): API, Camera angle, Files, IRON LEDGER — Bar-Path CV Sidecar, Setup, Why these choices

### Community 28 - "Community 28"
Cohesion: 0.33
Nodes (5): Deploy, Deploying the CV sidecar to Modal, Notes, One-time setup, Point Vercel at it

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (5): Constraints, Early decision, First step — BEFORE any model change, Form-check rebuild — fresh session kickoff prompt, Goal (judged VISUALLY on all 5 clips)

### Community 30 - "Community 30"
Cohesion: 0.33
Nodes (5): data, error, metadata, lang_id, query_str

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (5): counts, HOLD, PART, PASS, rows

### Community 32 - "Community 32"
Cohesion: 0.33
Nodes (5): counts, FAIL, PART, PASS, rows

### Community 33 - "Community 33"
Cohesion: 0.40
Nodes (3): _prewarm_rtmlib(), Modal deployment of the IRON LEDGER CV sidecar.  Wraps the existing FastAPI `a, Run at image-build time so the ONNX weights (~200 MB) are baked in.     Without

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (3): load(), main(), Join the pipeline's output with the r/formcheck coaching consensus into a side-b

### Community 35 - "Community 35"
Cohesion: 0.50
Nodes (3): data, error, metadata

## Knowledge Gaps
- **517 isolated node(s):** `UploadFile`, `JSONResponse`, `lift`, `fps`, `barSource` (+512 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `analyze_lift()` connect `Community 0` to `Community 25`, `Community 18`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `track_bar()` connect `Community 18` to `Community 25`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `track_pose()` connect `Community 10` to `Community 25`, `Community 18`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `Bench analysis from a pose track.  The bar is the wrist line. Effort is read f`, `Reject point spikes (the MediaPipe/CSRT teleport jumps that visibility     gati`, `Linearly interpolate NaN/inf samples per column (column of all-bad -> 0).` to the rest of the system?**
  _566 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._