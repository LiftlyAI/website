# IRON LEDGER — AI Powerlifting Coach

Block periodization. Coach-quality form check from your phone. Macros that respect your sport.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS — dark, industrial design system
- better-sqlite3 — local file-based persistence (`./data/coach.db`)
- Anthropic SDK — Claude `claude-opus-4-7` for program generation, bar-path coaching, chat (streamed), and meal plans
- Python CV sidecar (`cv-service/`) — FastAPI + MediaPipe pose; bar-path, rep-time & form (bench)
- Recharts — e1RM, bodyweight, and weekly volume charts

## Setup

1. Install dependencies. `better-sqlite3` is a native module — on Windows you'll need build tools (Visual Studio Build Tools 2022 with C++ workload, or run `npm install --global windows-build-tools` once).

   ```bash
   npm install
   ```

2. Configure your environment. Edit `.env.local` and add your Anthropic API key:

   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. (Optional) Initialize the database explicitly. Tables are also auto-created on first request.

   ```bash
   npm run db:init
   ```

4. Run the dev server.

   ```bash
   npm run dev
   ```

5. Open http://localhost:3000.

## How auth works (MVP)

There's no password. You enter your email, get an athlete row, and a session cookie binds your browser to it. This is **not secure for production** — replace with NextAuth Email + magic links before deploying.

## File map

```
src/
├── app/
│   ├── (app)/                  Authenticated app (dashboard, program, formcheck, …)
│   ├── api/                    Route handlers
│   ├── login/                  Email-only sign-in
│   ├── onboarding/             Multi-step wizard (5 steps)
│   ├── layout.tsx              Fonts (Bebas Neue, Inter, JetBrains Mono)
│   └── globals.css             Tailwind + chalk-card + plate-loader
├── components/
│   ├── ui/                     Button, Card, Input, RPEBadge, PlateSpinner
│   ├── nav/SideNav.tsx
│   └── layout/AppShell.tsx
└── lib/
    ├── anthropic.ts            Lazy SDK client + JSON unwrap helpers
    ├── auth.ts                 Cookie session, getOrCreate athlete
    ├── calculations.ts         BMR, TDEE, macros, e1RM, RPE chart
    ├── db.ts                   SQLite schema + WAL
    ├── prompts/
    │   ├── program.ts          Coach persona + periodization rules
    │   ├── formcheck.ts        Per-lift form-check checklists
    │   ├── chat.ts             Athlete-context-injected coach prompt
    │   └── nutrition.ts        ISSN/Helms-style meal-plan persona
    └── types.ts                Shared TypeScript types
```

## Feature notes

### Program generation
Onboarding finishes by calling Claude with the full athlete profile and a coach system prompt that encodes block-periodization rules. Output is structured JSON; we run a one-shot repair pass if the first parse fails. Generation takes ~30-90s.

### Form check → Bar path (bench)
The lifter uploads a bench clip. Next.js forwards it to a local Python CV
sidecar (`cv-service/`, FastAPI) that runs **body pose estimation**
(MediaPipe BlazePose). The lifter's wrist line *is* the bar — robust in a
gym full of circular plates, where blind circle detection fails — and the
same pose yields the joints for real form coaching. It segments reps on the
Calgary Barbell model (setup/unrack → descent → pause → press → lockout) and
measures per-rep concentric **time**, the J-curve, elbow extension/flare,
wrist-over-elbow stack, and hip/shoulder/foot stability. Everything is
body-relative (torso-lengths, % of ROM) so it survives any camera distance —
no plate-size calibration. Needs a one-time ~9 MB pose-model download
(`python download_model.py`), then runs offline.

**Effort is read from rep-time slowdown, not absolute m/s.** The concentric
slows as the lifter nears failure; the slowdown from the fastest rep to the
last maps to reps-in-reserve via bench velocity-loss research (~30% ≈
halfway, ~50% ≈ 1.6 RIR, ~80% ≈ RPE 10). The estimate starts on that curve
("rough", wide band) and sharpens to the lifter's own slowdown→RPE profile
("estimated" → "measured") as they confirm actual RPE on analysed sets
(`/api/formcheck/calibrate` → `velocity_log.slowdown_pct`). Claude then adds
coaching **grounded in the measured numbers + the annotated skeleton/bar
path** — it never invents the RPE.

Squat & deadlift reuse the pipeline; only bench is enabled today.

**Filming a clip (accuracy depends on this — also shown in-app):**
- **Angle:** foot of the bench or a clean side-on view; the bar's full travel must be visible.
- **Steady:** phone on a tripod / bench / floor — never hand-held or panned.
- **Framing:** whole body + full bar path in frame, from un-rack to re-rack.
- **The plate:** loaded plate fully visible and well lit — it's what gets tracked.
- **Clear shot:** nobody between the camera and the lifter.
- **One set per clip;** trim dead time at the start/end.

### Chat
Server-side streaming via the Anthropic SDK's stream API. Athlete profile, current week, and last 3 form checks are injected into the system prompt every call. Last 20 messages are kept as conversation history.

### Nutrition
Macros are computed deterministically (BMR via Mifflin or Katch-McArdle, activity multiplier by training days, phase adjustment ±300-400 kcal). Meal plans are AI-generated from those targets, honoring dietary restrictions.

### Progress
Bests-per-session e1RM (Brzycki for low reps, Brzycki+Epley average for higher reps) plotted across squat/bench/deadlift/total. Bodyweight with 7-day rolling average. Weekly stacked tonnage per lift.

## Known limitations / future work

- **Auth:** replace MVP cookie auth with NextAuth Email magic links before deploying.
- **Video storage:** form check stores frame *count* but not the original video. Add object storage (R2/S3) if you want playback.
- **Deload detection:** the spec called for auto-detected deloads from logged RPE drift — wire as a server-side cron once you have multi-week data.
- **RPE calibration:** shipping the raw form-check estimated RPE; the calibration score (athlete vs coach RPE delta over time) is not yet rendered.
- **Mobile:** the dark UI is responsive but designed desktop-first. Add a bottom nav for phones.
- **Rate limiting:** form-check Claude calls are not throttled — add a per-day cap.

## License

Private project. No license granted.
