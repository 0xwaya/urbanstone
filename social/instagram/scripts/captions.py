#!/usr/bin/env python3
"""Short Instagram captions built only from repo facts (data/talking_points.json).

hook -> material fact -> 1 brand point -> promo (only inside its date window)
-> rotating CTA (dm / link / call) -> AI note -> tagline/contact.
"""
import random

from common import config, load_json, promo_active

HOOKS = {
    "quartz": ["{stone} quartz: clean lines, zero fuss. 🤍", "Meet {stone}. Bright, calm and built for busy kitchens.",
               "This is what {stone} quartz does to a kitchen. ✨"],
    "granite": ["{stone}: natural stone with real character. 🖤", "Granite that earns a second look: {stone}.",
                "One slab, one of a kind. {stone} granite."],
    "quartzite": ["{stone}: the natural stone people stop to touch. ✨", "Premium look, natural strength. {stone}.",
                  "Quartzite moment: {stone} in a bright, airy kitchen."],
    "marble": ["{stone}: veining you can't fake. 🤍", "Statement stone alert: {stone}.",
               "Every slab tells its own story. {stone}."],
}
BRAND_POINT_IDS = ["fast_install", "warranty", "curated", "local", "full_service", "start_easy", "guided"]


def short_stone(scene):
    name, mat = scene["stone"], scene["material"]
    return name if mat.lower() not in name.lower() else name[: name.lower().rfind(mat.lower())].strip() or name


def next_cta(history):
    ids = [c["id"] for c in load_json("data/talking_points.json")["ctas"]]
    last = history[-1].get("cta") if history else None
    return ids[(ids.index(last) + 1) % len(ids)] if last in ids else ids[0]


def build(scene, history, when, hashtags_line, seed=None):
    tp = load_json("data/talking_points.json")
    cfg = config()
    rng = random.Random(seed)
    stone = short_stone(scene) if scene["material"] in ("quartz", "granite") else scene["stone"]
    hook = rng.choice(HOOKS[scene["material"]]).format(stone=stone)
    lines = [hook, "", tp["material_facts"][scene["material"]]["text"]]
    used = [h.get("brand_point") for h in history[-3:]]
    points = {p["id"]: p["text"] for p in tp["points"]}
    choices = [p for p in BRAND_POINT_IDS if p not in used] or BRAND_POINT_IDS
    brand_point = rng.choice(choices)
    lines.append(points[brand_point])
    if scene.get("catalog", False):
        lines.append("Available through our suppliers. Ask us about this slab for your project.")
    else:
        lines.append("Love this look? Ask us which slabs we can source to match it.")
    promo = promo_active(when)
    if promo:
        lines += ["", "🎁 " + tp["promo"]["text"] + " Through Dec 15."]
    cta = next_cta(history)
    lines += ["", "👉 " + {c["id"]: c["text"] for c in tp["ctas"]}[cta]]
    if cfg.get("label_ai_images"):
        lines += ["", "Image: AI-rendered design concept."]
    b = cfg["brand"]
    lines += ["", f"{b['tagline']}.", f"📞 {b['phone']} · ✉️ {b['email']} · 🌐 {b['site']}", "", hashtags_line]
    return "\n".join(lines), {"cta": cta, "brand_point": brand_point, "promo": promo, "hook": hook}
