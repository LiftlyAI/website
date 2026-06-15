"""Second pass: drop bad entries and fill category gaps with broader queries.

The first pass lost clips to deleted videos, and one 'low bar' hit was actually
an overhead squat. Broader queries + per-category exclusion regexes fill the
remainder without re-downloading what we already have.
"""

from __future__ import annotations

import json
import os
import re

from fetch_reddit import CLIPS, MANIFEST, MIN_DUR, MAX_DUR, download_video, fetch_comments, search_posts

DROP_IDS = {"1klsdyo"}  # "Overhead Squat first time" — not a low-bar squat

# category -> list of (query, must_match, must_not_match) tried in order
FILL = {
    "bench_close":   [("close grip", r"close\s*grip|cgbp", r"dumbbell|incline|decline")],
    "bench_wide":    [("wide grip", r"wide\s*grip", r"dumbbell|incline|decline|pull")],
    "squat_lowbar":  [("low bar", r"low\s*bar", r"overhead|front squat|zercher")],
    "deadlift_conv": [("deadlift form", r"deadlift", r"sumo|romanian|rdl|stiff|trap|hex"),
                      ("deadlift", r"deadlift", r"sumo|romanian|rdl|stiff|trap|hex")],
    "deadlift_sumo": [("sumo", r"sumo", r"romanian|rdl|stiff|trap|hex")],
}
WANT = {"bench_close": 2, "bench_wide": 2, "squat_lowbar": 2,
        "deadlift_conv": 2, "deadlift_sumo": 2}


def main() -> None:
    manifest = json.load(open(MANIFEST, encoding="utf-8"))
    for e in manifest:
        if e["id"] in DROP_IDS:
            p = os.path.join(CLIPS, e["file"])
            if os.path.exists(p):
                os.remove(p)
            print(f"dropped {e['category']} {e['id']} ({e['title'][:50]})")
    manifest = [e for e in manifest if e["id"] not in DROP_IDS]
    seen = {e["id"] for e in manifest}

    for cat, specs in FILL.items():
        have = sum(1 for e in manifest if e["category"] == cat)
        for query, must, must_not in specs:
            if have >= WANT[cat]:
                break
            rx, nrx = re.compile(must, re.I), re.compile(must_not, re.I)
            posts = search_posts(query, size=60)
            posts.sort(key=lambda p: -(p.get("num_comments") or 0))
            for p in posts:
                if have >= WANT[cat]:
                    break
                pid = p.get("id")
                if not pid or pid in seen:
                    continue
                rv = (p.get("media") or {}).get("reddit_video") or {}
                dur = rv.get("duration") or 0
                text = f"{p.get('title','')} {p.get('selftext','')}"
                if not rv or not (MIN_DUR <= dur <= MAX_DUR):
                    continue
                if (p.get("num_comments") or 0) < 3:
                    continue
                if not rx.search(text) or nrx.search(text):
                    continue
                comments = fetch_comments(pid)
                if len(comments) < 2:
                    continue
                dest = os.path.join(CLIPS, f"{cat}__{pid}.mp4")
                if not download_video(rv, dest):
                    print(f"  {cat}: video gone: {p.get('title','')[:55]}")
                    continue
                seen.add(pid)
                have += 1
                manifest.append({
                    "category": cat, "id": pid, "file": os.path.basename(dest),
                    "title": p.get("title", ""),
                    "permalink": f"https://www.reddit.com{p.get('permalink','')}",
                    "score": p.get("score"), "num_comments": p.get("num_comments"),
                    "duration": dur, "comments": comments,
                })
                print(f"  {cat}: + {dur}s nc={p.get('num_comments')} :: {p.get('title','')[:60]}")
        if have < WANT[cat]:
            print(f"  {cat}: still {have}/{WANT[cat]}")

    json.dump(manifest, open(MANIFEST, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    print(f"\nmanifest now {len(manifest)} clips")


if __name__ == "__main__":
    main()
