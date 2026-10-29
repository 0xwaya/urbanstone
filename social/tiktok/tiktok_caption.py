"""TikTok caption: shorter than Instagram, same repo facts, max ~5 TikTok-style tags."""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
MATERIAL_TAG = {"quartz": "quartzcountertops", "granite": "granite", "quartzite": "quartzite", "marble": "marble"}
CTA = {"dm": "DM us your kitchen pic 📸", "link": "Fast estimate: link in bio 🔗", "call": "Call/text (513) 307-5840 📞"}


def build(scene, cap_meta):
    with open(os.path.join(HERE, "config.json")) as f:
        cfg = json.load(f)
    tags = ["kitchentok", "countertops", MATERIAL_TAG.get(scene["material"], "countertops"), "cincinnati", "kitchenremodel"]
    tags = list(dict.fromkeys(tags))[: cfg["max_hashtags"]]
    lines = [cap_meta["hook"]]
    if cap_meta.get("promo"):
        lines.append("🎁 Free 18-gauge stainless sink on kitchens 50+ sq ft, through Dec 15.")
    lines.append(CTA[cap_meta["cta"]])
    lines.append("AI-rendered design concept · Urban Stone Collective")
    lines.append(" ".join("#" + t for t in tags))
    return "\n".join(lines)
