# How your program adapts

Liftly isn't a static spreadsheet. Every time you log a set, the program looks at
what you actually did and re-points your next targets. This is the closed loop:

> **Program → Execute → Review → Adapt → (back to Execute)**

Nothing here is a black box, and nothing changes your training silently. Here's
exactly what moves, and what doesn't.

---

## 1. Your targets auto-tune from what you lift

When you log a working set — weight × reps at the RPE it actually felt like — the
engine does three things:

1. **Estimates a 1-rep-max for that set.** It uses a Tuchscherer-style reps×RPE
   chart (the same one good coaches use): `3 reps @ RPE 8` maps to a known
   percentage of your max, so the set tells us your current e1RM.
2. **Takes a rolling best across recent sessions.** It weights your most recent
   session heaviest but won't overreact to one bad day — a single off session
   can't tank your numbers.
3. **Prescribes the next session's weight.** It works backwards from that e1RM and
   your next prescription's reps × target RPE, then rounds to the plate you can
   actually load.

You see this the moment you save: a **"what this changed"** panel showing the next
scheduled instance of each lift, the new suggested weight, the old planned weight
struck through, and a one-line reason.

**Example (measured on real data):** logging a squat triple at a higher e1RM moved
the next squat target from 125 lbs to 165 lbs — with the reason *"from your last
squat session's e1RM."* Log lighter or grind harder than expected, and it moves the
other way.

### Two safety rails inside the math
- **Deload trigger.** If your e1RM has drifted *down* across recent sessions, the
  engine flags a deload and caps the next suggestion at roughly −10%, rather than
  blindly pushing.
- **Rep regression (novices).** If you missed reps at a high RPE, it drops a rep on
  the next prescription (e.g. 3×5 → 3×4) to rebuild instead of repeatedly failing.

---

## 2. Readiness is an *optional* override — never a forced deload

Some days you're beat up. You can log a 30-second check-in (sleep, energy,
soreness, stress, plus an optional sharp/joint-pain flag). It produces:

- a **flag** — green / amber / red,
- a **soft RPE ceiling** — amber suggests capping the top set around RPE 8, red
  around RPE 7,
- a plain-language headline, named honestly.

Three rules govern it, on purpose:

1. **It's never required.** Skip it forever and the loop works exactly the same.
2. **It only ever suggests.** The cap is a ceiling you can ignore — if the bar
   moves well, trust that over the number. The autoregulation engine above does
   **not** read your readiness and silently rewrite your program.
3. **Pain is not soreness.** A sharp/joint-pain flag routes you toward mobility
   work and, if it persists, a physio — it never tells you to "push through it,"
   and it never invents a precise prescription out of a feeling.

This is deliberate: at one athlete, a daily wellness slider that quietly deloads
you is just fake precision. Readiness informs *you*; you decide.

---

## 3. The weekly review and the "Sunday tweak"

Once a week the **Adapt** step zooms out into a review card:

- **Planned vs. actual** — sessions, tonnage, and each main lift's top set, with
  on-track/off-track marks.
- **What the loop noticed** — advisory findings (see below).
- **The Sunday tweak** — the *single* change worth making next week, distilled from
  everything above. If nothing's flagging and the work got done, it says exactly
  that: *hold the line and run it back.*

### The decision rules behind "what the loop noticed"
Four small, independent checks. Each one *advises* — none of them rewrites your
program automatically:

| Signal | What it means | What it suggests |
|---|---|---|
| **Two sore days in a row** | Accumulated fatigue, not a fluke | Take today's top set to RPE −1 |
| **Same form fault in ≥2 clips** | A pattern, not a bad rep | A targeted technique drill before adding load |
| **e1RM flat across the block** | The stimulus stopped paying | Change one variable next block |
| **Big bar-speed drop in a set** | Those reps were near-maximal | Cap that set a rep earlier next time |

They surface only when the data actually supports them, so an empty week shows no
findings rather than inventing busywork.

---

## What it will never do

- Change your training from a self-reported feeling without telling you.
- Claim a precise RPE or readiness number it can't actually measure.
- Tell you to train through sharp or joint pain.
- Bury a deload inside the program — if a deload is warranted, it says so, in plain
  words, and the call is yours.

The whole point: a real coach's reasoning, made visible — so you always know *why*
the number changed.
