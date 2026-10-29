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
import rules

RECENT_STONE_WINDOW = 6

FINISH_TEXT = {
    "polished": "a high-gloss polished surface with a clean eased edge",
    "leathered": "a leathered finish (soft-sheen, subtly textured matte surface) with a clean eased edge",
    "live edge": "a natural live edge (rough, chiseled raw-stone edge) on the exposed front edge, leathered top",
}


def pick_finish(material, application, history, rng):
    options = rules.allowed_finishes(material, application)
    recent = [h.get("finish") for h in history[-4:] if h.get("material") == material]
    fresh = [f for f in options if f not in recent] or options
    return rng.choice(fresh)


def pick_application(history, rng):
    last = history[-1].get("application") if history else None
    apps = [a for a in rules.APPLICATIONS if a != last] or rules.APPLICATIONS
    return rng.choices(apps, weights=[rules.APPLICATION_WEIGHTS[a] for a in apps])[0]


def combo_key(c):
    return "|".join([c["stone"], c["cabinets"], c["style"], c["lighting"], c["layout"], c.get("application", ""), c.get("finish", "")])


def article(word):
    return "an" if word[:1].lower() in "aeiou" else "a"


def stone_label(stone):
    name, mat = stone["name"], stone["material"]
    return name if mat.lower() in name.lower() else f"{name} {mat}"


COMMON_TAIL = (
    "Clean bright exposure, fresh and stunning, uncluttered, real materials and true-to-life reflections, "
    "eye-level architectural photography, 24-35mm lens, magazine quality. "
    "Tall vertical 9:16 composition: the stone surface sits in the vertical middle of the frame and spans "
    "no more than 85% of the width, with generous space above and below, so the image can also be cropped "
    "to 4:5 and 1:1 around it. Quiet, low-detail upper corners. No people, no text, no logos, no watermarks."
)


def build_prompt(c, stone):
    slab = f"{stone_label(stone)} ({stone['look']}), 3cm thick, {FINISH_TEXT[c['finish']]}"
    app = c.get("application", "kitchen island")
    if app == "outdoor kitchen/grill area":
        return (f"Bright sunny photorealistic photograph of a {c['style']} outdoor kitchen and grill area on a stone patio: "
                f"built-in stainless grill and outdoor cabinetry under an open pergola. The hero is the countertop: {slab}, "
                f"shown in full. {c['hardware'].capitalize()} accents, clear blue-sky daylight, potted herbs, a few grilling tools. "
                + COMMON_TAIL)
    if app == "vanity":
        return (f"Bright, airy photorealistic photograph of {article(c['style'])} {c['style']} bathroom vanity. "
                f"The hero is the vanity top and full-height backsplash in {slab}, with an intricate design detail: a "
                f"precise contrasting stone inlay border and bookmatched veining. {c['cabinets'].capitalize()} vanity base, "
                f"{c['hardware']} faucet and hardware, large mirror, {c['lighting']}. Styled minimally (folded towel, small plant). "
                + COMMON_TAIL)
    if app == "fireplace":
        return (f"Bright, airy photorealistic photograph of {article(c['style'])} {c['style']} living room. "
                f"The hero is a floor-to-ceiling fireplace surround clad in {slab}, bookmatched with an intricate inlay "
                f"detail framing the firebox, matching stone hearth. {c['lighting']}, light walls, a low sofa edge and a "
                f"plant at the frame edge. " + COMMON_TAIL)
    backsplash = (" The same stone runs as a full-height slab backsplash behind the range, veining flowing continuously "
                  "from countertop to backsplash.") if app == "backsplash" else ""
    return (
        f"Bright, airy, light-filled photorealistic interior photograph of {article(c['style'])} {c['style']} kitchen, {c['layout']}. "
        f"The hero is the countertop: {slab}, shown in full with no cropped ends or corners.{backsplash} "
        f"{c['cabinets'].capitalize()} with {c['hardware']} hardware, {c['lighting']}. "
        "Light walls, styled minimally (a bowl of lemons, a small vase of greenery, a cutting board). " + COMMON_TAIL
    )


BEFORE_SCENES = {
    "outdoor kitchen/grill area": (
        "the same backyard patio BEFORE the remodel: a bare, weathered concrete slab with a freestanding old "
        "kettle grill and a worn folding table, faded fence, patchy lawn edge, no built-in outdoor kitchen, no countertop"),
    "vanity": (
        "the same bathroom BEFORE the remodel: a dated vanity with a cracked, stained cultured-marble top with an "
        "integrated shell sink, yellowed caulk, old oak cabinet, builder-grade mirror and dated brass light bar"),
    "fireplace": (
        "the same living room BEFORE the remodel: a dated fireplace with dull 1990s beige ceramic tile surround, "
        "chipped grout and a plain painted wood mantel, no stone"),
}


def before_prompt(c):
    """Prompt for the BEFORE half of a before-and-after post (same room, same camera angle)."""
    return (f"Photorealistic photograph of {BEFORE_SCENES[c['application']]}. Same {c['style']} room proportions, "
            "same eye-level camera position and framing as a finished-remodel photo, bright natural daylight, honest "
            "and realistic (not dark or dirty), tall vertical 9:16 composition with the surface in the vertical middle. "
            "No people, no text, no logos, no watermarks.")


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
    application = pick_application(history, rng)
    allowed = [s for s in space["stones"] if s["material"] in rules.allowed_materials(application)]
    if not [s for s in allowed if s["name"] not in recent_stones] and application == rules.OUTDOOR:
        # outdoor is granite-only; if every granite was used recently, pick an indoor application instead
        indoor = [a for a in rules.APPLICATIONS if a != rules.OUTDOOR]
        application = rng.choices(indoor, weights=[rules.APPLICATION_WEIGHTS[a] for a in indoor])[0]
        allowed = [s for s in space["stones"] if s["material"] in rules.allowed_materials(application)]
    space["stones"] = allowed
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
                    "application": application,
                    "finish": pick_finish(stone["material"], application, history, rng),
                }
                if application != "kitchen island" and application != "backsplash":
                    c["layout"] = application
                assert not rules.violations(c["material"], c["finish"], application)
                c["key"] = combo_key(c)
                if c["key"] not in used:
                    c["prompt"] = build_prompt(c, stone)
                    c["format"] = "before_after" if application in rules.BEFORE_AFTER_APPS else "single"
                    if c["format"] == "before_after":
                        c["before_prompt"] = before_prompt(c)
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
