"""Fetch r/formcheck test clips + coaching comments for the form-check CV eval.

Reddit blocks direct API access from this network, so submissions and comments
come from the PullPush archive (api.pullpush.io) and the videos straight off
the v.redd.it CDN, which is not blocked. For each lift VARIATION we grab the
most-discussed video posts; the top-level comments are the human coaching
consensus the pipeline's advice gets graded against.

Output:
  research/clips/<category>__<id>.mp4
  research/manifest.json   (per clip: title, permalink, duration, comments[])
"""

from __future__ import annotations

import json
import os
import re
import time
import urllib.parse
import urllib.request

BASE = os.path.dirname(os.path.abspath(__file__))
CLIPS = os.path.join(BASE, "clips")
MANIFEST = os.path.join(BASE, "manifest.json")

PP = "https://api.pullpush.io/reddit/search"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

# category -> (search query, regex the title/selftext must match so a generic
# hit can't masquerade as a variation, clips wanted)
CATEGORIES = {
    "bench":          ("bench press",            r"bench",                          3),
    "bench_close":    ("close grip bench",       r"close\s*grip|cgbp",              2),
    "bench_wide":     ("wide grip bench",        r"wide\s*grip",                    2),
    "squat_highbar":  ("high bar squat",         r"high\s*bar",                     2),
    "squat_lowbar":   ("low bar squat",          r"low\s*bar",                      2),
    "deadlift_conv":  ("conventional deadlift",  r"conventional|deadlift",          2),
    "deadlift_sumo":  ("sumo deadlift",          r"sumo",                           2),
}

MIN_DUR, MAX_DUR = 6, 90        # seconds; a full set, not a 3s teaser or a vlog
MIN_COMMENTS = 3                # need real coaching consensus to grade against


def get_json(url: str, retries: int = 3):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001
            if i == retries - 1:
                print(f"    !! {e} for {url[:90]}")
                return None
            time.sleep(2 * (i + 1))


def search_posts(query: str, size: int = 40) -> list[dict]:
    q = urllib.parse.quote(query)
    url = f"{PP}/submission/?subreddit=formcheck&q={q}&size={size}&sort=desc&sort_type=score"
    d = get_json(url)
    return (d or {}).get("data", [])


def fetch_comments(post_id: str) -> list[dict]:
    url = f"{PP}/comment/?link_id={post_id}&size=75"
    d = get_json(url)
    out = []
    for c in (d or {}).get("data", []):
        body = (c.get("body") or "").strip()
        author = c.get("author") or ""
        if author.lower() in ("automoderator", "[deleted]"):
            continue
        if body in ("[removed]", "[deleted]") or len(body) < 25:
            continue
        # top-level only: parent is the post itself
        if not str(c.get("parent_id", "")).startswith("t3_"):
            continue
        out.append({"author": author, "score": c.get("score"), "body": body})
    out.sort(key=lambda c: -(c["score"] or 0))
    return out[:12]


def download_video(rv: dict, dest: str) -> bool:
    url = rv.get("fallback_url") or ""
    url = url.split("?")[0]
    if not url:
        return False
    candidates = [url]
    # fallback may 403/404 for some heights — try standard DASH renditions too
    base = re.sub(r"/DASH_\d+\.mp4$", "", url)
    for h in (720, 1080, 480, 360):
        c = f"{base}/DASH_{h}.mp4"
        if c not in candidates:
            candidates.append(c)
    for c in candidates:
        try:
            req = urllib.request.Request(c + "?source=fallback", headers=UA)
            with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
                f.write(r.read())
            if os.path.getsize(dest) > 100_000:   # a real clip, not an error stub
                return True
        except Exception:  # noqa: BLE001
            continue
    if os.path.exists(dest):
        os.remove(dest)
    return False


def main() -> None:
    os.makedirs(CLIPS, exist_ok=True)
    manifest: list[dict] = []
    seen: set[str] = set()

    for cat, (query, title_re, want) in CATEGORIES.items():
        print(f"== {cat}: '{query}'")
        posts = search_posts(query)
        rx = re.compile(title_re, re.IGNORECASE)
        # most-discussed first — comments are the ground truth we're here for
        posts.sort(key=lambda p: -(p.get("num_comments") or 0))
        got = 0
        for p in posts:
            if got >= want:
                break
            pid = p.get("id")
            if not pid or pid in seen:
                continue
            rv = (p.get("media") or {}).get("reddit_video") or {}
            dur = rv.get("duration") or 0
            text = f"{p.get('title','')} {p.get('selftext','')}"
            if not rv or not (MIN_DUR <= dur <= MAX_DUR):
                continue
            if (p.get("num_comments") or 0) < MIN_COMMENTS:
                continue
            if not rx.search(text):
                continue
            comments = fetch_comments(pid)
            if len(comments) < 2:
                continue
            dest = os.path.join(CLIPS, f"{cat}__{pid}.mp4")
            if not os.path.exists(dest) and not download_video(rv, dest):
                print(f"    skip (video gone): {p.get('title','')[:60]}")
                continue
            seen.add(pid)
            got += 1
            manifest.append({
                "category": cat,
                "id": pid,
                "file": os.path.basename(dest),
                "title": p.get("title", ""),
                "permalink": f"https://www.reddit.com{p.get('permalink','')}",
                "score": p.get("score"),
                "num_comments": p.get("num_comments"),
                "duration": dur,
                "comments": comments,
            })
            print(f"    ok [{got}/{want}] {dur}s nc={p.get('num_comments')} :: {p.get('title','')[:60]}")
        if got < want:
            print(f"    WARNING only {got}/{want} for {cat}")

    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"\n{len(manifest)} clips -> {CLIPS}\nmanifest -> {MANIFEST}")


if __name__ == "__main__":
    main()
