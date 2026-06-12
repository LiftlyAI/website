"""Join the pipeline's output with the r/formcheck coaching consensus into a
side-by-side grading table (markdown) for ANALYSIS.md.

Inputs:
  manifest.json          — per-clip Reddit title + top comments
  advice/<file>.json     — full analyze_lift output per clip (advice_dump.py)
  eval_*/summary.json    — topline rows from visual_eval.py (coverage, reps…)

Output: grading.md — per clip: what the pipeline said vs what Reddit said,
plus topline numbers, ready for human verdicts.
"""

from __future__ import annotations

import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def load(p):
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except OSError:
        return None


def main() -> None:
    manifest = load(os.path.join(HERE, "manifest.json")) or []
    rows = {}
    for d in ("eval_bench", "eval_squat", "eval_deadlift"):
        for r in load(os.path.join(HERE, d, "summary.json")) or []:
            rows[r["file"]] = r

    out = ["# Pipeline advice vs r/formcheck consensus\n"]
    for e in sorted(manifest, key=lambda e: e["category"]):
        name = e["file"]
        adv = load(os.path.join(HERE, "advice", name + ".json"))
        top = rows.get(name, {})
        out.append(f"## [{e['category']}] {name}")
        out.append(f"**Post:** {e['title'][:140]}  ")
        out.append(f"**Topline:** cov={top.get('coverage')} reps={top.get('reps')} "
                   f"rpe={top.get('rpe')} t={top.get('totalSec')}s  ")
        out.append("**Pipeline said:**")
        if adv is None:
            out.append("- (no advice dump yet)")
        elif "error" in adv:
            out.append(f"- ERROR: {adv['error']}")
        else:
            s = adv.get("summary", {})
            out.append(f"- reps={s.get('repCount')} rpe={s.get('rpe')} "
                       f"({s.get('rpeConfidence')}) loss={s.get('velocityLossPct')}%")
            out.append(f"- barPath: {s.get('barPathNote')}")
            for note in s.get("formNotes", []):
                out.append(f"- {note}")
            for wmsg in adv.get("warnings", []):
                out.append(f"- WARN: {wmsg}")
        out.append("**Reddit consensus (top comments):**")
        for c in e["comments"][:5]:
            body = c["body"].replace("\n", " ")[:240]
            out.append(f"- ({c['score']}) {body}")
        out.append("**Verdict:** _fill in: match / partial / miss / invented-fault_\n")

    with open(os.path.join(HERE, "grading.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print(f"wrote {os.path.join(HERE, 'grading.md')}")


if __name__ == "__main__":
    main()
