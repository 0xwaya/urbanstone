#!/usr/bin/env python3
"""Pick a 5-tag Instagram hashtag set for a post (Instagram caps posts at 5 hashtags since Dec 2025).

Slots (config.json -> hashtags_per_post): material (e.g. #granitecountertops) + detail (stone/finish/trade,
e.g. #blackgranite, #leatheredgranite, #countertops) + application (e.g. #kitchenisland, #outdoorkitchen) +
local (#cincinnati + one rotating Cincinnati/NKY tag). Sets rotate so each differs from the last few posts.
Research and sources: hashtag-study-2026-10-31.md, data/hashtags.json.
"""
import hashlib
import random

from common import config, load_json

IG_MAX = 5


def eligible(entries, stone=None, finish=None):
    out = []
    for e in entries:
        if e.get("only_for_stones") and not (stone and any(k.lower() in stone.lower() for k in e["only_for_stones"])):
            continue
        if e.get("only_for_finishes") and finish not in e["only_for_finishes"]:
            continue
        out.append(e)
    return out


def tag_list(entries, stone=None, finish=None):
    return [e["tag"] for e in eligible(entries, stone, finish)]


def _draw(rng, entries, k, exclude=()):
    pool = [e for e in entries if e["tag"] not in exclude]
    out = []
    while pool and len(out) < k:
        e = rng.choices(pool, weights=[e.get("weight", 1) for e in pool])[0]
        out.append(e["tag"])
        pool = [p for p in pool if p["tag"] != e["tag"]]
    return out


def pick(material, history, seed=None, stone=None, application="kitchen island", finish=None):
    cfg = config()
    n = cfg["hashtags_per_post"]
    cap = min(cfg.get("instagram_max_hashtags", IG_MAX), IG_MAX)
    data = load_json("data/hashtags.json")
    rng = random.Random(seed)
    window = cfg.get("hashtag_history_window", 3)
    previous = [set(h.get("hashtags", [])) for h in history[-window:]]
    material_pool = eligible(data["material"].get(material, []), stone, finish)
    detail_pool = eligible(data["detail"].get(material, []) + data["detail"]["general"], stone, finish)
    app_pool = eligible(data["application"].get(application) or data["application"]["kitchen island"], stone, finish)
    local_pool = eligible(data["local"]["rotating"], stone, finish)
    best = None
    for _ in range(60):
        tags = _draw(rng, material_pool, n["material"])
        tags += _draw(rng, detail_pool, n["detail"], tags)
        tags += _draw(rng, app_pool, n["application"], tags)
        tags += [data["local"]["always"]["tag"]] + _draw(rng, local_pool, n["local"] - 1, tags)
        tags = list(dict.fromkeys(tags))[:cap]
        diff = min((len(set(tags) ^ p) for p in previous), default=99)
        if best is None or diff > best[0]:
            best = (diff, tags)
        if diff >= cfg["hashtag_set_min_difference"]:
            break
    tags = best[1]
    assert len(tags) <= IG_MAX, tags
    set_id = hashlib.sha1(" ".join(sorted(tags)).encode()).hexdigest()[:8]
    return tags, set_id


def render(tags):
    return " ".join("#" + t for t in tags)
