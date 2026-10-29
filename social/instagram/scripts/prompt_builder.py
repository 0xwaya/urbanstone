#!/usr/bin/env python3
"""Build the next unique kitchen-scene prompt.

Picks a stone/cabinet/style/lighting/layout/hardware combo that has never been
used (state/history.json), favouring the material category used least and never
repeating a stone used in the last 6 posts. Writes state/pending_scene.json and
prints the image prompt. Feed the prompt to an image model (GenerateImage,
1080x1350 portrait 4:5), then run make_post.py --scene <image>.

Usage: python3 social/instagram/scripts/prompt_builder.py [--json] [--seed N]
"""
import argparse
import hashlib
import json
import random
from collections import Counter

from common import config, load_json, save_json, now

RECENT_STONE_WINDOW = 6


def combo_key(c):
    return "|".join([c["stone"], c["cabinets"], c["style"], c["lighting"], c["layout"]])


def article(word):
    return "an" if word[:1].lower() in "aeiou" else "a"


def stone_label(stone):
    name, mat = stone["name"], stone["material"]
    return name if mat.lower() in name.lower() else f"{name} {mat}"


def build_prompt(c, stone):
    return (
        f"Bright, airy, light-filled photorealistic interior photograph of {article(c['style'])} {c['style']} kitchen, {c['layout']}. "
        f"The hero is the countertop: {stone_label(stone)} ({stone['look']}), "
        "3cm thick with a clean eased edge, shown in full with no cropped ends or corners. "
        f"{c['cabinets'].capitalize()} with {c['hardware']} hardware, {c['lighting']}. "
        "Light walls, clean bright exposure, fresh and stunning, styled minimally (a bowl of lemons, "
        "a small vase of greenery, a cutting board), uncluttered, real materials and true-to-life "
        "reflections, eye-level architectural photography, 24-35mm lens, magazine quality. "
        "Tall vertical 9:16 composition: the countertop sits in the vertical middle of the frame and spans "
        "no more than 85% of the width, with generous ceiling/upper cabinets above and floor below, "
        "so the image can also be cropped to 4:5 and 1:1 around the countertop. Quiet, low-detail upper "
        "corners (plain wall or ceiling). No people, no text, no logos, no watermarks."
    )


def choose(seed=None):
    space = load_json("data/design_space.json")
    if config().get("supplier_stones_only", False):
        # only slabs the site's suppliers carry (frontend/data/curated-slab-options.js), Edward Oct 29 2026
        space["stones"] = [s for s in space["stones"] if s.get("catalog")]
    history = load_json("state/history.json", [])
    used = {h["key"] for h in history}
    recent_stones = {h["stone"] for h in history[-RECENT_STONE_WINDOW:]}
    last_material = history[-1]["material"] if history else None
    rng = random.Random(seed if seed is not None else now().isoformat())

    mat_counts = Counter(h["material"] for h in history)
    materials = sorted({s["material"] for s in space["stones"]},
                       key=lambda m: (m == last_material, mat_counts[m], rng.random()))
    fresh = [s for s in space["stones"] if s["name"] not in recent_stones]
    pool = fresh or space["stones"]  # only repeat a recent stone if every stone is recent
    materials = [m for m in materials if any(s["material"] == m for s in pool)]
    for material in materials:
        stones = [s for s in pool if s["material"] == material]
        rng.shuffle(stones)
        for stone in stones:
            for _ in range(200):
                c = {
                    "stone": stone["name"],
                    "material": stone["material"],
                    "catalog": stone["catalog"],
                    "cabinets": rng.choice(space["cabinets"]),
                    "style": rng.choice(space["styles"]),
                    "lighting": rng.choice(space["lighting"]),
                    "layout": rng.choice(space["layouts"]),
                    "hardware": rng.choice(space["hardware"]),
                }
                c["key"] = combo_key(c)
                if c["key"] not in used:
                    c["prompt"] = build_prompt(c, stone)
                    c["id"] = hashlib.sha1(c["key"].encode()).hexdigest()[:10]
                    c["created_at"] = now().isoformat()
                    return c
    raise SystemExit("design space exhausted: add stones/cabinets/styles to data/design_space.json")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true", help="print the full scene JSON instead of the prompt")
    ap.add_argument("--seed", type=int)
    args = ap.parse_args()
    scene = choose(args.seed)
    save_json("state/pending_scene.json", scene)
    print(json.dumps(scene, indent=2) if args.json else scene["prompt"])


if __name__ == "__main__":
    main()
