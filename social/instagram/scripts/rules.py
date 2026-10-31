#!/usr/bin/env python3
"""Content rules Edward set (Oct 29, 2026). Used by prompt_builder, make_post and the publish routine.

- Live edge finish: granite only (marble chips/crumbles on a live edge).
- Leathered: granite, marble, quartzite. Quartz: polished.
- Outdoor kitchen / grill area: granite only (never marble, quartzite or quartz outdoors).
- Hashtags: Instagram accepts at most 5 per post (Dec 2025); the CLI warns when a caption has more.

CLI: python3 social/instagram/scripts/rules.py <queue_folder>  -> exit 1 if the post breaks a rule.
"""
import json
import os
import sys

FINISHES = {
    "granite": ["leathered", "polished", "live edge"],
    "marble": ["polished", "leathered"],
    "quartzite": ["polished", "leathered"],
    "quartz": ["polished"],
}
OUTDOOR_FINISHES = ["leathered", "live edge"]  # weather/heat/grease-friendly look for grill areas
APPLICATIONS = ["kitchen island", "backsplash", "outdoor kitchen/grill area", "vanity", "fireplace"]
APPLICATION_WEIGHTS = {"kitchen island": 5, "backsplash": 1.5, "outdoor kitchen/grill area": 1.2,
                       "vanity": 1.2, "fireplace": 1.1}
OUTDOOR = "outdoor kitchen/grill area"
# These applications post as a before-and-after pair (Edward, Oct 29 2026).
BEFORE_AFTER_APPS = [OUTDOOR, "vanity", "fireplace"]


def allowed_materials(application):
    return ["granite"] if application == OUTDOOR else list(FINISHES)


def allowed_finishes(material, application):
    opts = FINISHES.get(material, ["polished"])
    if application == OUTDOOR:
        opts = [f for f in opts if f in OUTDOOR_FINISHES]
    return opts


def violations(material, finish, application):
    out = []
    if finish not in FINISHES.get(material, []):
        out.append(f"{finish} finish is not allowed on {material}"
                   + (" (live edge is granite only)" if finish == "live edge" else ""))
    if application not in APPLICATIONS:
        out.append(f"unknown application '{application}'")
    if application == OUTDOOR and material != "granite":
        out.append(f"outdoor kitchen/grill area must be granite, not {material}")
    return out


def check_folder(folder):
    with open(os.path.join(folder, "meta.json")) as f:
        d = json.load(f).get("dimensions", {})
    if not d.get("finish") or not d.get("application"):
        return ["post has no finish/application tags (made before Oct 29 rules); review manually"]
    v = violations(d["material"], d["finish"], d["application"])
    if d["application"] in BEFORE_AFTER_APPS and d.get("format") != "before_after":
        v.append(f"{d['application']} posts must use the before-and-after format")
    return v


IG_MAX_HASHTAGS = 5  # Instagram cap since Dec 2025 (help.instagram.com/351460621611097)


def hashtag_warnings(folder):
    """Warn (not block) when a caption has more hashtags than Instagram accepts."""
    import re
    out = []
    for name, limit in (("caption.txt", IG_MAX_HASHTAGS), ("tiktok_caption.txt", 5)):
        p = os.path.join(folder, name)
        if os.path.exists(p):
            n = len(re.findall(r"(?<!\w)#\w+", open(p, encoding="utf-8").read()))
            if n > limit:
                out.append(f"{name} has {n} hashtags (limit {limit}); trim before posting")
    return out


if __name__ == "__main__":
    v = check_folder(sys.argv[1])
    for w in hashtag_warnings(sys.argv[1]):
        print("WARN: " + w)
    print("OK" if not v else "BLOCKED: " + "; ".join(v))
    sys.exit(1 if v else 0)
