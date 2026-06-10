# Graph Report - .  (2026-06-08)

## Corpus Check
- Large corpus: 163 files · ~1,962,777 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 503 nodes · 1024 edges · 33 communities (28 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.83)
- Token cost: 40,987 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_App Pages & API Routes|App Pages & API Routes]]
- [[_COMMUNITY_Lift Analysis Engine (Python)|Lift Analysis Engine (Python)]]
- [[_COMMUNITY_NPM Dependencies|NPM Dependencies]]
- [[_COMMUNITY_Domain Types & Nutrition UI|Domain Types & Nutrition UI]]
- [[_COMMUNITY_CV Sidecar API & Bar Tracking|CV Sidecar API & Bar Tracking]]
- [[_COMMUNITY_Pose Detection (MediaPipe)|Pose Detection (MediaPipe)]]
- [[_COMMUNITY_Project Docs & Design Rationale|Project Docs & Design Rationale]]
- [[_COMMUNITY_Training Program Logic|Training Program Logic]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_App Shell & Navigation|App Shell & Navigation]]
- [[_COMMUNITY_Fitness Calculations & Progress|Fitness Calculations & Progress]]
- [[_COMMUNITY_AI Provider Layer|AI Provider Layer]]
- [[_COMMUNITY_Auth & UI Form Components|Auth & UI Form Components]]
- [[_COMMUNITY_Nutrition Safety & Allergens|Nutrition Safety & Allergens]]
- [[_COMMUNITY_Visual Eval Harness (Python)|Visual Eval Harness (Python)]]
- [[_COMMUNITY_Form-Check UI Client|Form-Check UI Client]]
- [[_COMMUNITY_CV Service Client & Form Prompts|CV Service Client & Form Prompts]]
- [[_COMMUNITY_Program View & Session Logging|Program View & Session Logging]]
- [[_COMMUNITY_RPE Velocity Estimation|RPE Velocity Estimation]]
- [[_COMMUNITY_Onboarding Wizard|Onboarding Wizard]]
- [[_COMMUNITY_Dashboard & Charts|Dashboard & Charts]]
- [[_COMMUNITY_YOLOv8 Pose Backend|YOLOv8 Pose Backend]]
- [[_COMMUNITY_Session Auth & Routing|Session Auth & Routing]]
- [[_COMMUNITY_Root Layout & Fonts|Root Layout & Fonts]]
- [[_COMMUNITY_Pose Model Download|Pose Model Download]]
- [[_COMMUNITY_YOLO De-risk Probe|YOLO De-risk Probe]]
- [[_COMMUNITY_Logout  Session Clear|Logout / Session Clear]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_Tailwind Config|Tailwind Config]]

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 38 edges
2. `requireSession()` - 34 edges
3. `AthleteProfile` - 24 edges
4. `analyze_lift()` - 18 edges
5. `uuid()` - 17 edges
6. `compilerOptions` - 16 edges
7. `cn()` - 14 edges
8. `POST()` - 12 edges
9. `aiGenerate()` - 12 edges
10. `ndarray` - 11 edges

## Surprising Connections (you probably didn't know these)
- `YOLOv8-pose + ByteTrack Rebuild (deployment-gated)` --semantically_similar_to--> `Wrist Line Is the Bar (pose, not circle detection)`  [INFERRED] [semantically similar]
  cv-service/NEXT_SESSION_PROMPT.md → README.md
- `analysis.py — bar path, rep segmentation, RPE/RIR, overlay` --implements--> `Calgary Barbell Bench Rep Segmentation Model`  [INFERRED]
  cv-service/README.md → README.md
- `bar.py — OpenCV Hough/CSRT plate tracking (broken)` --conceptually_related_to--> `Wrist Line Is the Bar (pose, not circle detection)`  [INFERRED]
  cv-service/NEXT_SESSION_PROMPT.md → README.md
- `pose.py — MediaPipe PoseLandmarker (VIDEO mode)` --implements--> `Wrist Line Is the Bar (pose, not circle detection)`  [INFERRED]
  cv-service/README.md → README.md
- `analysis.py — bar path, rep segmentation, RPE/RIR, overlay` --implements--> `Effort From Rep-Time Slowdown (not absolute m/s)`  [INFERRED]
  cv-service/README.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Bench form-check CV pipeline (pose → analysis → API)** — cv_service_readme_pose, cv_service_readme_analysis, cv_service_readme_app, cv_service_readme_analyze_endpoint [INFERRED 0.85]
- **Scale-free CV design principles (wrist=bar, slowdown, body-relative)** — readme_wrist_is_bar, readme_effort_from_slowdown, readme_body_relative_units [INFERRED 0.75]

## Communities (33 total, 5 thin omitted)

### Community 0 - "App Pages & API Routes"
Cohesion: 0.09
Nodes (51): POST(), Body, POST(), ChatPage(), Body, POST(), Dashboard(), FormCheckPage() (+43 more)

### Community 1 - "Lift Analysis Engine (Python)"
Cohesion: 0.11
Nodes (30): analyze_lift(), _angle(), _bench_notes(), _Body, _clean_signal(), _deadlift_notes(), _drop_bogus_reps(), _effort_and_form() (+22 more)

### Community 2 - "NPM Dependencies"
Cohesion: 0.06
Nodes (33): dependencies, @anthropic-ai/sdk, better-sqlite3, clsx, @google/genai, lucide-react, next, react (+25 more)

### Community 3 - "Domain Types & Nutrition UI"
Cohesion: 0.09
Nodes (23): ChatView(), QUICK, BarPathPoint, BenchGrip, ChatMessage, DeadliftStance, DietaryRestriction, Equipment (+15 more)

### Community 4 - "CV Sidecar API & Bar Tracking"
Cohesion: 0.10
Nodes (21): analyze(), _get_pose_model(), _json_safe(), IRON LEDGER bar-path CV sidecar.  Pose-based bench analysis: the wrist line is t, NaN/inf are not valid JSON — recursively replace with None so a stray     non-fi, BarTrack, _hough_near(), ndarray (+13 more)

### Community 5 - "Pose Detection (MediaPipe)"
Cohesion: 0.14
Nodes (21): _best_rotation(), _cand_wrist_y(), _candidate(), _detect_candidates(), _detect_in_region(), _lifter_crop(), _lifter_likeness(), _make_landmarker() (+13 more)

### Community 6 - "Project Docs & Design Rationale"
Cohesion: 0.12
Nodes (24): bar.py — OpenCV Hough/CSRT plate tracking (broken), Deployment Target Decision (CPU/GPU gates rebuild), eval_samples.py RPE-in-band proxy metric (untrustworthy), Form-check Rebuild Session Kickoff, Visual Eval Harness (judge overlays, not RPE-in-band), YOLOv8-pose + ByteTrack Rebuild (deployment-gated), analysis.py — bar path, rep segmentation, RPE/RIR, overlay, POST /analyze Endpoint (+16 more)

### Community 7 - "Training Program Logic"
Cohesion: 0.19
Nodes (18): rpePercent(), suggestWeight(), adjustExercise(), AdjustInput, AdjustResult, e1rmFromSet(), extractLifterSets(), liftOf() (+10 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 9 - "App Shell & Navigation"
Cohesion: 0.19
Nodes (11): AppShell(), rpeColor(), cn(), MobileNav(), primary, secondary, links, SideNav() (+3 more)

### Community 10 - "Fitness Calculations & Progress"
Cohesion: 0.19
Nodes (17): activityMultiplier(), bmr(), brzycki(), epley(), estimatedOneRM(), katch(), macroTargets(), mifflin() (+9 more)

### Community 11 - "AI Provider Layer"
Cohesion: 0.18
Nodes (16): activeProvider(), AiCallOptions, AiImage, AiMessage, anthropicClient(), anthropicGenerate(), anthropicMessages(), COACH_MODEL (+8 more)

### Community 12 - "Auth & UI Form Components"
Cohesion: 0.17
Nodes (11): ProfileView(), Button, ButtonProps, Size, sizes, Variant, variants, FieldProps (+3 more)

### Community 13 - "Nutrition Safety & Allergens"
Cohesion: 0.15
Nodes (15): ALLERGY_FILLER, ANIMAL_OTHER, DAIRY, DIET_RULES, DietRule, FISH, GF_SAFE, GLUTEN (+7 more)

### Community 14 - "Visual Eval Harness (Python)"
Cohesion: 0.22
Nodes (14): draw_skeleton(), fit_panel(), ground_truth_rpe(), main(), ndarray, PoseTrack, Visual eval harness for the bench form-check pipeline.  The OLD eval_samples.py, Camera-side wrist (more-visible of L/R) per frame, in pixels, plus its     visib (+6 more)

### Community 15 - "Form-Check UI Client"
Cohesion: 0.15
Nodes (7): Analysis, CONF_LABEL, FILMING_BY_LIFT, FormCheckCard(), FormCheckClient(), SubmitLift, fmtDate()

### Community 16 - "CV Service Client & Form Prompts"
Cohesion: 0.21
Nodes (11): analyzeVideo(), CvServiceError, cvServiceHealthy(), cvServiceUrl(), CvAnalysis, benchTable(), buildBenchFormCheckPrompt(), buildFormCheckPrompt() (+3 more)

### Community 17 - "Program View & Session Logging"
Cohesion: 0.19
Nodes (10): Exercise, ProgramDay, LoggedExercise, LoggedSet, LogSessionModal(), AdjustMap, AdjustResult, DayCard() (+2 more)

### Community 18 - "RPE Velocity Estimation"
Cohesion: 0.26
Nodes (11): RpeConfidence, RpeEstimate, CalibrationPoint, clampRpe(), curveFor(), estimateRpe(), genericRpeFromLoss(), linFit() (+3 more)

### Community 19 - "Onboarding Wizard"
Cohesion: 0.18
Nodes (3): empty, StepProps, PlateSpinner()

### Community 20 - "Dashboard & Charts"
Cohesion: 0.25
Nodes (5): BWPoint, E1RMPoint, VolumePoint, Card(), CardHeader()

### Community 21 - "YOLOv8 Pose Backend"
Cohesion: 0.32
Nodes (7): _detect_candidates(), ndarray, PoseTrack, YOLOv8-pose backend for bench form-check — the minimal detector swap (Path B)., Run YOLO on `frame` (or a crop of it, upscaled) and return one pose.py-     styl, _read_strided(), track_pose()

### Community 22 - "Session Auth & Routing"
Cohesion: 0.38
Nodes (5): AppLayout(), Landing(), getSession(), OnboardingWizard(), OnboardingPage()

### Community 23 - "Root Layout & Fonts"
Cohesion: 0.33
Nodes (4): inter, jetbrains, metadata, spaceGrotesk

## Knowledge Gaps
- **137 isolated node(s):** `UploadFile`, `JSONResponse`, `ndarray`, `PoseTrack`, `nextConfig` (+132 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AthleteProfile` connect `App Pages & API Routes` to `Domain Types & Nutrition UI`, `Training Program Logic`, `Fitness Calculations & Progress`, `Auth & UI Form Components`, `Nutrition Safety & Allergens`, `CV Service Client & Form Prompts`, `Program View & Session Logging`, `Onboarding Wizard`, `Dashboard & Charts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `getDb()` connect `App Pages & API Routes` to `Domain Types & Nutrition UI`, `Training Program Logic`, `Fitness Calculations & Progress`, `Dashboard & Charts`, `Session Auth & Routing`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `requireSession()` connect `App Pages & API Routes` to `Domain Types & Nutrition UI`, `Training Program Logic`, `Fitness Calculations & Progress`, `Dashboard & Charts`, `Session Auth & Routing`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `analyze_lift()` (e.g. with `analyze()` and `main()`) actually correct?**
  _`analyze_lift()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Bench analysis from a pose track.  The bar is the wrist line. Effort is read fro`, `Reject point spikes (the MediaPipe/CSRT teleport jumps that visibility     gatin`, `Linearly interpolate NaN/inf samples per column (column of all-bad -> 0).` to the rest of the system?**
  _173 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Pages & API Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.0886615515771526 - nodes in this community are weakly interconnected._
- **Should `Lift Analysis Engine (Python)` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._