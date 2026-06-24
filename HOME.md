---
name: home
description: Map of content for the powerlifting-coach project — start here when opening this folder as an Obsidian vault.
tags: [moc, index]
---

# 🏋️ Powerlifting Coach — Home

The entry point for this repo as an Obsidian vault. Wikilinks below resolve to
markdown notes; source areas are listed as file paths you can open in your editor.

> **Stack:** Next.js + React + TypeScript · Postgres (Supabase) · Python CV sidecar · Capacitor mobile shells.
> **Product:** an AI powerlifting coach — programs, execution, form-check video analysis, nutrition, and a B2B coach console.

---

## 📚 Docs & Plans

- [[README]] — project readme / setup
- [[CLAUDE]] — agent instructions (graphify rules live here)
- [[how-the-program-adapts]] — how the coaching engine adjusts training week to week
- [[stripe-runbook]] — billing/subscriptions operational runbook
- [[market-research-outreach]] — market research & outreach notes
- [[native-android-ios-apps.plan]] — plan for going full native (Android first)

---

## 🧭 The core loop (Program → Execute → Review → Adapt)

The product's spine. Pure, unit-tested decision logic drives weekly adaptation.

| Stage | What it does | Key source |
|---|---|---|
| **Program** | Generates/serves the training program | `src/lib/program.ts`, `src/lib/programming.ts` |
| **Execute** | "Today" view + session handoffs | `src/lib/handoff.ts`, `src/app/(app)/program/` |
| **Review** | Weekly review + form/effort signals | `src/lib/weekly-review.ts`, `src/lib/review-data.ts` |
| **Adapt** | Readiness soft-override + decision rules | `src/lib/readiness.ts`, `src/lib/decision-rules.ts` |
| **Progress** | Tracking & trend surfaces | `src/lib/progress.ts`, `src/app/(app)/progress/` |

See [[how-the-program-adapts]] for the narrative version.

---

## 🎥 Form-check (computer vision)

Bench bar-path tracking via a Python sidecar, deployed to Modal; browser uploads direct.

- Web glue: `src/lib/cvService.ts`, `src/lib/form-review-data.ts`
- CV service (Python): `cv-service/`
- Sample inputs: `sample_videos/`
- Status & gotchas live in Claude memory: pipeline status, failure modes, Modal deploy notes.

---

## 🥗 Nutrition

Allergy-validated, persisted meal plans with a "steer" box.

- `src/lib/nutrition-safety.ts`

---

## 🤖 AI layer

- Orchestration & calls: `src/lib/ai.ts`
- Prompt templates: `src/lib/prompts/`
- Suggestions / triage: `src/lib/suggestions.ts`, `src/lib/triage.ts`

---

## 💳 Pricing & billing

Free (metered) / Pro / Coach-per-client. Entitlements gate features.

- Plans/entitlements: `src/lib/limits.ts`
- Stripe integration: `src/lib/stripe.ts`
- Pricing page: `src/app/pricing/`
- Ops: [[stripe-runbook]]

---

## 👥 Surfaces

| Surface | Source |
|---|---|
| **Web app (auth'd)** | `src/app/(app)/` |
| **Coach console (B2B)** | `src/app/coach/`, `src/lib/coach-auth.ts`, `src/lib/coach-data.ts` |
| **Admin** | `src/app/admin/`, `src/lib/admin-auth.ts`, `src/lib/admin-data.ts` |
| **Public / marketing** | `src/app/page.tsx`, `src/app/blog/`, `src/app/pricing/`, `src/app/legal` |
| **API** | `src/app/api/v1/` (program, progress) |
| **Mobile shells** | `android/`, `ios/`, `capacitor/` — WebView shells loading hosted liftly.tech |

---

## 🛠️ Foundations

- **Auth:** `src/lib/auth.ts`
- **DB:** `src/lib/db.ts` (async Postgres adapter, Supabase pooler), `src/lib/supabase/`, `db/`
- **Domain types:** `src/lib/types.ts`
- **Calc/velocity:** `src/lib/calculations.ts`, `src/lib/velocity.ts`
- **Design system:** dark theme (black + electric-blue), Space Grotesk / Inter

---

## 🔗 Related graphs

- **Code knowledge graph:** `graphify-out/` — run `graphify query "<question>"` for a scoped subgraph; `graphify-out/GRAPH_REPORT.md` for the broad view.
- **Claude memory vault:** a *separate* Obsidian vault at
  `…/.claude/projects/C--Users-ashay-powerlifting-coach/memory/` — my cross-session notes (open it on its own and hit `Ctrl+G`).

---

## ▶️ How to use this vault

1. `Ctrl+O` — jump to any note by name.
2. `Ctrl+G` — graph view (links between the markdown docs above).
3. Excluded from graph for sanity: `node_modules`, `.next`, `android`, `ios`, `cv-service` build artifacts.
4. Edit any note here freely — Claude Code reads the same files next session.
