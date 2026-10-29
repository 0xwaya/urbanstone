#!/usr/bin/env python3
"""Render the three Instagram formats from one scene with a small logo stamp.

Design standard (Edward, 2026-10-29): bright full-bleed photo edge to edge, no
bands or text on the image. The only branding is a small translucent stamp of
the chevron + three towers (brand/logo-icon.png, from brand/logo.tex), ~12% of
the width at ~65% opacity with a very soft shadow, in the calmest corner that
does not touch the countertop.

Formats: 1x1 1080x1080 (grid), 4x5 1080x1350 (feed), 9x16 1080x1920 (Story/Reel).
Generate the scene at 9:16 so every format is a crop (never letterboxed or
stretched). Crops are centred on the countertop (focus_y = its vertical
position in the scene, 0 top .. 1 bottom).

Usage: python3 compose.py --scene scene.jpg --out-dir DIR [--focus-y 0.6]
"""
import argparse
import os

import numpy as np
from PIL import Image, ImageFilter

from common import config, path


def crop_to(img, W, H, focus_y):
    """Scale to cover WxH and crop around focus_y (fraction of scene height)."""
    s = max(W / img.width, H / img.height)
    img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    left = (img.width - W) // 2
    top = round(focus_y * img.height - H / 2)
    top = max(0, min(top, img.height - H))
    out = img.crop((left, top, left + W, top + H))
    # where the countertop centre lands inside this crop (0..1)
    return out, (focus_y * img.height - top) / H


def busyness(gray, box):
    x0, y0, x1, y1 = box
    region = gray[y0:y1, x0:x1]
    gy, gx = np.gradient(region)
    return float(region.std() + 2.0 * np.hypot(gx, gy).mean())


def pick_corner(img, stamp_size, margin, counter_y, cfg):
    """Return (corner, box) of the least busy allowed corner."""
    W, H = img.size
    sw, sh = stamp_size
    l, t, r, b = margin
    gray = np.asarray(img.convert("L"), dtype=np.float32)
    band = cfg["counter_band"] * H
    cands = {
        "top-left": (l, t), "top-right": (W - r - sw, t),
        "bottom-left": (l, H - b - sh), "bottom-right": (W - r - sw, H - b - sh),
    }
    scored = []
    for name, (x, y) in cands.items():
        box = (x, y, x + sw, y + sh)
        if box[3] > counter_y * H - band and box[1] < counter_y * H + band:
            continue  # would overlap the countertop band
        score = busyness(gray, box) + 1.0  # +1 so flat corners still respect the top preference
        if name.startswith("bottom") and cfg.get("prefer", "top") == "top":
            score *= cfg.get("bottom_penalty", 1.6)
        scored.append((score, name, box))
    if not scored:
        raise RuntimeError("no corner clear of the countertop; adjust focus_y or margins")
    scored.sort()
    return scored[0][1], scored[0][2], {n: round(s, 1) for s, n, _ in scored}


def stamp(img, box, cfg):
    x, y, x1, y1 = box
    icon = Image.open(path("brand", "logo-icon.png")).convert("RGBA")
    icon = icon.resize((x1 - x, y1 - y), Image.LANCZOS)
    alpha = icon.getchannel("A").point(lambda v: int(v * cfg["opacity"]))
    icon.putalpha(alpha)
    base = img.convert("RGBA")
    if cfg.get("shadow", True):
        pad = 24
        sh = Image.new("RGBA", (icon.width + 2 * pad, icon.height + 2 * pad), (0, 0, 0, 0))
        mask = icon.getchannel("A").point(lambda v: int(v * 0.35))
        sh.paste((11, 18, 32, 255), (pad, pad), mask)
        sh = sh.filter(ImageFilter.GaussianBlur(9))
        base.alpha_composite(sh, (x - pad + 2, y - pad + 3))
    base.alpha_composite(icon, (x, y))
    return base.convert("RGB")


def compose(scene_path, out_dir, focus_y=None):
    cfg = config()
    focus_y = cfg["default_focus_y"] if focus_y is None else focus_y
    scene = Image.open(scene_path).convert("RGB")
    os.makedirs(out_dir, exist_ok=True)
    results = {}
    for name, f in cfg["formats"].items():
        W, H = f["width"], f["height"]
        img, counter_y = crop_to(scene, W, H, focus_y)
        img = img.filter(ImageFilter.UnsharpMask(radius=1.4, percent=70, threshold=2))
        with Image.open(path("brand", "logo-icon.png")) as icon:
            iw, ih = icon.size
        sw = round(W * cfg["logo_stamp"]["width_frac"])
        sh = round(sw * ih / iw)
        corner, box, scores = pick_corner(img, (sw, sh), f["margin"], counter_y, cfg["logo_stamp"])
        img = stamp(img, box, cfg["logo_stamp"])
        out = os.path.join(out_dir, f"post_{name}.png")
        img.save(out, "PNG", optimize=True)
        # Instagram's Graph API only accepts JPEG for image posts
        img.save(out[:-4] + ".jpg", "JPEG", quality=92, subsampling=0, optimize=True)
        results[name] = {"png": out, "jpg": out[:-4] + ".jpg", "size": [W, H],
                         "logo_corner": corner, "corner_scores": scores,
                         "scene_upscale": round(max(W / scene.width, H / scene.height), 2)}
    return results


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--scene", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--focus-y", type=float)
    a = ap.parse_args()
    import json
    print(json.dumps(compose(a.scene, a.out_dir, a.focus_y), indent=2))
