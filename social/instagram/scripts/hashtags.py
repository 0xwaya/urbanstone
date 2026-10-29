#!/usr/bin/env python3
"""Pick a rotating, tier-mixed hashtag set (about 15-20 tags) for a post."""
import hashlib
import random

from common import config, load_json


def tag_list(entries, stone=None):
    return [e["tag"] for e in entries
            if not e.get("only_for_stones") or (stone and any(k.lower() in stone.lower() for k in e["only_for_stones"]))]


def pick(material, history, seed=None, stone=None):
    cfg = config()
    n = cfg["hashtags_per_post"]
    pools = load_json("data/hashtags.json")["tiers"]
    rng = random.Random(seed)
    previous = [set(h.get("hashtags", [])) for h in history[-6:]]
    best = None
    for _ in range(60):
        niche_pool = tag_list(pools["niche"].get(material, []), stone) + tag_list(pools["niche"]["general"], stone)
        material_tags = tag_list(pools["niche"].get(material, []), stone)
        niche = material_tags[:1] + rng.sample([t for t in niche_pool if t not in material_tags[:1]],
                                               max(0, n["niche"] - 1))
        local = ["cincinnati"] + rng.sample([t for t in tag_list(pools["local"]) if t != "cincinnati"], n["local"] - 1)
        tags = (rng.sample(tag_list(pools["high"]), n["high"]) + rng.sample(tag_list(pools["mid"]), n["mid"])
                + niche + local)
        tags = list(dict.fromkeys(tags))
        diff = min((len(set(tags) ^ p) for p in previous), default=99)
        if best is None or diff > best[0]:
            best = (diff, tags)
        if diff >= cfg["hashtag_set_min_difference"]:
            break
    tags = best[1]
    set_id = hashlib.sha1(" ".join(sorted(tags)).encode()).hexdigest()[:8]
    return tags, set_id


def render(tags):
    return " ".join("#" + t for t in tags)
