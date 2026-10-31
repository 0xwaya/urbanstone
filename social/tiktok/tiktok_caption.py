"""TikTok caption: shorter than Instagram, same repo facts, 5 specific tags (TikTok caps posts at 5).

Tags: material countertop tag + #countertops + application tag + #cincinnati + a community/format tag
(#kitchentok for kitchens, #beforeandafter for before-and-after posts). See
social/instagram/hashtag-study-2026-10-31.md.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
MATERIAL_TAG = {"quartz": "quartzcountertops", "granite": "granitecountertops", "quartzite": "quartzite",
                "marble": "marblecountertops"}
APPLICATION_TAG = {"kitchen island": "kitchenremodel", "backsplash": "backsplash",
                   "outdoor kitchen/grill area": "outdoorkitchen", "vanity": "bathroomremodel",
                   "fireplace": "fireplacemakeover"}
CTA = {"dm": "DM us your kitchen pic 📸", "link": "Fast estimate: link in bio 🔗", "call": "Call/text (513) 307-5840 📞"}


def tags_for(scene):
    app = scene.get("application", "kitchen island")
    community = "beforeandafter" if scene.get("format") == "before_after" else "kitchentok"
    return [MATERIAL_TAG.get(scene["material"], "countertops"), "countertops",
            APPLICATION_TAG.get(app, "kitchenremodel"), "cincinnati", community]


def build(scene, cap_meta):
    with open(os.path.join(HERE, "config.json")) as f:
        cfg = json.load(f)
    tags = list(dict.fromkeys(tags_for(scene)))[: cfg["max_hashtags"]]
    lines = [cap_meta["hook"]]
    if cap_meta.get("promo"):
        lines.append("🎁 Free 18-gauge stainless sink on kitchens 50+ sq ft, through Dec 15.")
    lines.append(CTA[cap_meta["cta"]])
    lines.append("AI-rendered design concept · Urban Stone Collective")
    lines.append(" ".join("#" + t for t in tags))
    return "\n".join(lines)
