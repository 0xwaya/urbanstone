#!/usr/bin/env python3
"""Instagram captions built from repo facts (data/talking_points.json), styled by
application, material and finish (Edward, Oct 29 2026). Same base content and tone
(hook, fact, brand point, supplier line, promo, CTA, AI note, tagline/contact,
hashtags); only length and emphasis change:

  before_after_outdoor  outdoor kitchen/grill: transformation story, granite only,
                        leathered/live-edge granite for weather, heat and grease
  before_after_feature  vanity/fireplace: transformation story, intricate design and inlays
  punchy                leathered (or live edge) granite: short and direct
  design                quartzite and Calacatta/Taj Mahal/Carrara-style quartz: longer, design-focused
  exotic                marble (e.g. Nero Marquina): statement piece, slab-by-slab character
  classic               everything else (the original style)
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
STYLE_HOOKS = {
    "punchy": ["{finish_cap} {stone}. Built tough, looks sharp. 🖤", "{stone}, {finish}. That's it. That's the post. 🔥",
               "Touch it once and you get it: {finish} {stone}. 🖤"],
    "design": ["Designing around {stone}: light, movement and a calm, high-end finish. ✨",
               "{stone} sets the tone for the whole room. Here's how we'd build around it. 🤍",
               "Soft veining, big impact: a {style} kitchen designed around {stone}. ✨"],
    "exotic": ["Statement stone alert: {stone}. 🖤", "Not for the faint of heart: {stone}. ✨",
               "{stone}: the slab people walk across the showroom for. 🤍"],
    "before_after_outdoor": ["Before ➡️ after: from bare patio to a {finish} {stone} granite grill station. 🔥",
                             "Swipe-worthy backyard glow-up: {finish} {stone} granite, built for grilling season. 🔥"],
    "before_after_feature": ["Before ➡️ after: this {app} went from dated to detailed in {stone}. ✨",
                             "Same {app}, whole new story: {stone} with intricate stone detail. 🤍"],
}
FINISH_LINES = {
    "polished": "Polished finish: a high gloss that makes the color and veining pop.",
    "leathered": "Leathered finish: a soft sheen and a texture you can feel.",
    "live edge": "Live edge: the slab's raw, natural edge, left on purpose. We only do live edge in granite.",
}
DESIGN_STONES = ("calacatta", "taj mahal", "carrara")
BRAND_POINT_IDS = ["fast_install", "warranty", "curated", "local", "full_service", "start_easy", "guided"]


def caption_style(scene):
    app, mat, fin = scene.get("application", "kitchen island"), scene["material"], scene.get("finish", "polished")
    if scene.get("format") == "before_after":
        return "before_after_outdoor" if app == "outdoor kitchen/grill area" else "before_after_feature"
    if mat == "marble":
        return "exotic"
    if mat == "quartzite" or (mat == "quartz" and any(k in scene["stone"].lower() for k in DESIGN_STONES)):
        return "design"
    if mat == "granite" and fin in ("leathered", "live edge"):
        return "punchy"
    return "classic"


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
    style = caption_style(scene)
    fin = scene.get("finish", "polished")
    app = scene.get("application", "kitchen island")
    stone = short_stone(scene) if scene["material"] in ("quartz", "granite") else scene["stone"]
    fmt = dict(stone=stone, finish=fin, finish_cap=fin.capitalize(), style=scene.get("style", ""), app=app)
    hook = rng.choice(STYLE_HOOKS.get(style) or HOOKS[scene["material"]]).format(**fmt)
    fact = tp["material_facts"][scene["material"]]["text"]
    points = {p["id"]: p["text"] for p in tp["points"]}
    used = [h.get("brand_point") for h in history[-3:]]
    choices = [p for p in BRAND_POINT_IDS if p not in used] or BRAND_POINT_IDS
    brand_point = rng.choice(choices)
    supplier = ("Available through our suppliers. Ask us about this slab for your project." if scene.get("catalog")
                else "Love this look? Ask us which slabs we can source to match it.")
    promo = promo_active(when)

    lines = [hook, ""]
    if style == "punchy":
        lines += [FINISH_LINES[fin], points[brand_point]]
    elif style == "design":
        lines += [f"The design: {scene.get('cabinets', '')}, {scene.get('hardware', '')} hardware and "
                  f"{scene.get('lighting', '')}, all built around {stone}. Light stone keeps the room open; "
                  "the veining adds movement without the busy feel.",
                  "", FINISH_LINES[fin], fact, points[brand_point], points["guided"] if brand_point != "guided" else "",
                  supplier]
    elif style == "exotic":
        lines += [f"{scene['stone']} is a showpiece. Bold veining, deep contrast, and no two slabs alike.",
                  fact, FINISH_LINES[fin], "Pick your actual slab: we walk you through it so the veining lands "
                  "exactly where you want it.", supplier]
    elif style == "before_after_outdoor":
        lines += ["Before: a bare patio and a lonely grill. After: a built-in grill station topped with "
                  f"{fin} {stone} granite.",
                  f"Outdoors we use granite only. A {fin} granite top handles weather, heat and grease, so it's "
                  "made for grill season. We never put marble or quartzite outside.",
                  fact, points[brand_point], supplier]
    elif style == "before_after_feature":
        lines += [f"Before: a dated, worn {app} surface. After: {scene['stone']} with intricate design work, "
                  f"bookmatched veining and a custom inlay detail, in a {fin} finish.",
                  "Vanities and fireplaces are where stone gets to show off: intricate patterns and inlays turn a "
                  "surface into the focal point of the room.",
                  FINISH_LINES[fin], points[brand_point], supplier]
    else:  # classic
        lines += [fact, points[brand_point], supplier]
    lines = [l for i, l in enumerate(lines) if l or i in (1,) or (style == "design" and i == 3)]
    if app in ("vanity", "fireplace"):
        promo = False  # the fall sink offer is for kitchen projects
    if promo:
        lines += ["", "🎁 " + (tp["promo"]["short"] if style == "punchy" else tp["promo"]["text"] + " Through Dec 15.")]
    cta = next_cta(history)
    cta_text = {c["id"]: c["text"] for c in tp["ctas"]}[cta]
    space = {"vanity": "bathroom", "fireplace": "fireplace", "outdoor kitchen/grill area": "patio"}.get(app)
    if space:
        cta_text = cta_text.replace("your kitchen", f"your {space}")
    lines += ["", "👉 " + cta_text]
    if cfg.get("label_ai_images"):
        note = ("Images: AI-rendered before-and-after design concept." if scene.get("format") == "before_after"
                else "Image: AI-rendered design concept.")
        lines += ["", note]
    b = cfg["brand"]
    lines += ["", f"{b['tagline']}.", f"📞 {b['phone']} · ✉️ {b['email']} · 🌐 {b['site']}", "", hashtags_line]
    return "\n".join(lines), {"cta": cta, "brand_point": brand_point, "promo": promo, "hook": hook,
                              "caption_style": style}
