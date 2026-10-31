#!/usr/bin/env python3
"""Queue a REAL-PROJECT post (Edward's job photos) into a fixed slot.

Unlike make_post.py (AI scenes), this takes finished job photos, crops each to
4:5 (feed) / 1:1 (grid) / 9:16 (Story + TikTok) around a horizontal focus point,
stamps the company seal, and writes captions given in a spec file. No AI label;
the caption says it is a real Urban Stone project. EXIF/GPS is dropped because
every output is re-encoded from pixels only. state/history.json is NOT touched
(it tracks AI scene combos).

Spec (JSON): {"slot": "YYYY-MM-DD HH:MM", "job": "real-job-01", "title": ...,
  "format": "carousel"|"single", "application": ..., "images": [
    {"src": "/abs/path.jpg", "name": "01-bath", "focus_x": 0.5, "focus_x_9x16": 0.45, "alt": "..."}],
  "story_image": 0, "caption": "...", "tiktok_caption": "...", "hashtags": [...5],
  "tiktok_hashtags": [...5], "cta": "dm"|"link"|"call", "promo": bool,
  "location": "IG location tag (default Cincinnati, Ohio)", "location_note": "why it overrides",
  "instagram_tag_users": ["handle"]  # tagged in the photo on IG (no @)}

Usage: python3 social/instagram/scripts/make_real_post.py SPEC.json --photos-dir DIR [--replace]
"""
import argparse
import json
import os
import shutil
import sys
from datetime import timezone

from PIL import Image, ImageFilter

from common import QUEUE, config, now, parse_slot, save_json
import compose
import hashtags as ht

# post-log.md 'Location' rule (Edward, Oct 29): Cincinnati, Ohio unless a job says otherwise
DEFAULT_LOCATION = "Cincinnati, Ohio"


def crop_x(img, W, H, focus_x):
    s = max(W / img.width, H / img.height)
    img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    left = round(focus_x * img.width - W / 2)
    left = max(0, min(left, img.width - W))
    top = (img.height - H) // 2
    return img.crop((left, top, left + W, top + H)), round(max(W, H) / max(img.width, img.height) * s, 2)


def render(src, out_dir, stem, focus_x, focus_x_tall, cfg):
    img = Image.open(src).convert("RGB")
    out = {}
    for name, f in cfg["formats"].items():
        W, H = f["width"], f["height"]
        fx = focus_x_tall if name == "9x16" else focus_x
        im, _ = crop_x(img, W, H, fx)
        im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=50, threshold=2))
        sw = round(W * cfg["logo_stamp"]["width_frac"])
        # counter_y=0.75: keeps the seal out of the lower-middle band where tops/vanities sit
        corner, box, _ = compose.pick_corner(im, (sw, sw), f["margin"], 0.75, cfg["logo_stamp"])
        im = compose.stamp(im, box, cfg["logo_stamp"], cfg["brand"])
        jpg = os.path.join(out_dir, f"{stem}_{name}.jpg")
        im.save(jpg, "JPEG", quality=92, subsampling=0, optimize=True)
        out[name] = {"jpg": os.path.basename(jpg), "logo_corner": corner,
                     "upscale": round(max(W / img.width, H / img.height), 2)}
    return out


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("spec")
    ap.add_argument("--replace", action="store_true")
    ap.add_argument("--photos-dir", default="", help="folder that relative image src paths are resolved against")
    a = ap.parse_args(argv)
    spec = json.load(open(a.spec, encoding="utf-8"))
    cfg = config()
    when = parse_slot(spec["slot"])
    qid = when.strftime("%Y-%m-%d-%H%M")
    folder = os.path.join(QUEUE, qid)
    if os.path.exists(folder):
        old = json.load(open(os.path.join(folder, "meta.json")))
        if old.get("status") != "queued" or not a.replace:
            sys.exit(f"{folder} exists (status {old.get('status')}); refusing")
        shutil.rmtree(folder)
    os.makedirs(folder)
    tags = spec["hashtags"]
    assert len(tags) <= ht.IG_MAX, tags
    assert len(spec["tiktok_hashtags"]) <= 5
    slides = []
    for i, im in enumerate(spec["images"], 1):
        src = im["src"] if os.path.isabs(im["src"]) else os.path.join(a.photos_dir, im["src"])
        files = render(src, folder, f"slide_{i:02d}", im["focus_x"], im.get("focus_x_9x16", im["focus_x"]), cfg)
        slides.append({"name": im["name"], "alt": im["alt"], "files": files})
    # legacy single-image names (post_*.jpg) point at the story/cover image so existing steps still work
    cover = slides[spec.get("story_image", 0)]
    for fmt, f in cover["files"].items():
        shutil.copyfile(os.path.join(folder, f["jpg"]), os.path.join(folder, f"post_{fmt}.jpg"))
    caption = spec["caption"].rstrip() + "\n\n" + ht.render(tags) + "\n"
    open(os.path.join(folder, "caption.txt"), "w", encoding="utf-8").write(caption)
    tt = spec["tiktok_caption"].rstrip() + "\n" + " ".join("#" + t for t in spec["tiktok_hashtags"]) + "\n"
    open(os.path.join(folder, "tiktok_caption.txt"), "w", encoding="utf-8").write(tt)
    meta = {
        "queue_id": qid,
        "status": "queued",
        "source": "real-install",
        "approved": not cfg["require_approval"],
        "scheduled_at_local": when.isoformat(),
        "scheduled_at_utc": when.astimezone(timezone.utc).isoformat(),
        "created_at_utc": now().astimezone(timezone.utc).isoformat(),
        "feed_format": cfg["feed_format"],
        "files": {k: {"jpg": f"post_{k}.jpg", "logo_corner": v["logo_corner"]} for k, v in cover["files"].items()},
        "carousel": {
            "feed": [s["files"][cfg["feed_format"]]["jpg"] for s in slides],
            "tiktok": [s["files"]["9x16"]["jpg"] for s in slides],
            "story": cover["files"]["9x16"]["jpg"],
        },
        "slides": slides,
        "dimensions": {
            "post_type": "real project", "application": spec["application"], "format": spec["format"],
            "material": None, "finish": None, "stone": None, "cta": spec["cta"], "promo": spec.get("promo", False),
            "caption_style": "real_project", "slot": when.strftime("%-I %p"), "job": spec["job"], "title": spec["title"],
        },
        "hashtags": tags,
        "scene": {"ai_generated": False, "job": spec["job"]},
        "location": spec.get("location", DEFAULT_LOCATION),
        "location_note": spec.get("location_note", ""),
        "platforms": {"instagram": {"status": "queued", "location": spec.get("location", DEFAULT_LOCATION),
                                    "tag_users": spec.get("instagram_tag_users", [])},
                      "tiktok": {"status": "queued"}},
        "posting_notes": spec.get("posting_notes", ""),
    }
    save_json(os.path.join(folder, "meta.json"), meta)
    print(folder)


if __name__ == "__main__":
    main()
