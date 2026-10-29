#!/usr/bin/env python3
"""Generate + queue one post from a scene image (the single entry command).

  1. python3 social/instagram/scripts/prompt_builder.py    -> prints the scene prompt
  2. generate the scene image from that prompt (9:16 portrait)
  3. python3 social/instagram/scripts/make_post.py --scene /path/scene.jpg [--slot "YYYY-MM-DD HH:MM"]

Writes queue/YYYY-MM-DD-HHMM/{post_1x1,post_4x5,post_9x16}.{png,jpg}, scene.jpg,
caption.txt, tiktok_caption.txt, meta.json and records the combo in state/history.json.
Default slot = next configured slot (config.json schedule_slots, America/New_York).
"""
import argparse
import os
import shutil
import sys
from datetime import timezone

from common import QUEUE, config, load_json, next_slot, now, parse_slot, save_json
import captions
import compose
import hashtags


def slot_label(dt):
    return dt.strftime("%-I%p").replace("AM", " AM").replace("PM", " PM").strip()


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--scene", required=True, help="scene image generated from the pending prompt")
    ap.add_argument("--slot", help='local time "YYYY-MM-DD HH:MM" (default: next configured slot)')
    ap.add_argument("--focus-y", type=float, help="countertop vertical position in the scene, 0..1")
    ap.add_argument("--post-type", default="kitchen", help="kitchen | remnant | before-after | promo | ...")
    ap.add_argument("--replace", action="store_true", help="overwrite an existing queue folder for this slot")
    a = ap.parse_args(argv)

    when = parse_slot(a.slot) if a.slot else next_slot()
    folder = os.path.join(QUEUE, when.strftime("%Y-%m-%d-%H%M"))
    scene = load_json("state/pending_scene.json")
    if not scene and a.replace:  # re-render an existing post with its original scene combo
        scene = load_json(os.path.join(folder, "meta.json"), {}).get("scene_full")
    if not scene:
        sys.exit("no state/pending_scene.json: run prompt_builder.py first")
    history = load_json("state/history.json", [])
    if os.path.exists(folder):
        if not a.replace:
            sys.exit(f"{folder} exists (use --replace)")
        old = load_json(os.path.join(folder, "meta.json"), {})
        history = [h for h in history if h.get("queue_id") != old.get("queue_id")]
        shutil.rmtree(folder)
    os.makedirs(folder)

    renders = compose.compose(a.scene, folder, a.focus_y)
    shutil.copyfile(a.scene, os.path.join(folder, "scene" + os.path.splitext(a.scene)[1].lower()))
    tags, set_id = hashtags.pick(scene["material"], history, seed=scene["id"], stone=scene["stone"])
    caption, cap_meta = captions.build(scene, history, when, hashtags.render(tags), seed=scene["id"])
    with open(os.path.join(folder, "caption.txt"), "w", encoding="utf-8") as f:
        f.write(caption + "\n")
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tiktok"))
        import tiktok_caption
        with open(os.path.join(folder, "tiktok_caption.txt"), "w", encoding="utf-8") as f:
            f.write(tiktok_caption.build(scene, cap_meta) + "\n")
    except ImportError:
        pass

    cfg = config()
    queue_id = when.strftime("%Y-%m-%d-%H%M")
    meta = {
        "queue_id": queue_id,
        "status": "queued",
        "approved": not cfg["require_approval"],
        "scheduled_at_local": when.isoformat(),
        "scheduled_at_utc": when.astimezone(timezone.utc).isoformat(),
        "created_at_utc": now().astimezone(timezone.utc).isoformat(),
        "feed_format": cfg["feed_format"],
        "files": {k: {"png": os.path.basename(v["png"]), "jpg": os.path.basename(v["jpg"]),
                      "logo_corner": v["logo_corner"]} for k, v in renders.items()},
        "dimensions": {
            "post_type": a.post_type, "material": scene["material"], "stone": scene["stone"],
            "catalog_stone": scene["catalog"], "style": scene["style"], "cabinets": scene["cabinets"],
            "lighting": scene["lighting"], "layout": scene["layout"], "hardware": scene["hardware"],
            "cta": cap_meta["cta"], "brand_point": cap_meta["brand_point"], "promo": cap_meta["promo"],
            "hashtag_set_id": set_id, "slot": slot_label(when),
        },
        "hashtags": tags,
        "scene_full": scene,
        "scene": {"id": scene["id"], "key": scene["key"], "prompt": scene["prompt"], "ai_generated": True},
        "platforms": {"instagram": {"status": "queued"}, "tiktok": {"status": "queued"}},
    }
    save_json(os.path.join(folder, "meta.json"), meta)
    history.append({"queue_id": queue_id, "key": scene["key"], "stone": scene["stone"],
                    "material": scene["material"], "cta": cap_meta["cta"],
                    "brand_point": cap_meta["brand_point"], "hashtags": tags, "hashtag_set_id": set_id})
    save_json("state/history.json", history)
    pending = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "state", "pending_scene.json")
    if os.path.exists(pending):
        os.remove(pending)
    print(folder)


if __name__ == "__main__":
    main()
