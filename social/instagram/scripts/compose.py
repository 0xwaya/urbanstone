#!/usr/bin/env python3
"""Render the three Instagram formats from one scene with the company seal.

Design standard (Edward, 2026-10-29, seal revision): bright full-bleed photo edge
to edge, no bands. The branding is the company seal: a circular, semi-translucent
navy disc (~70%) with a thin gold ring, the gold chevron + three towers icon
(brand/logo-icon.png, from brand/logo.tex) and URBAN STONE / COLLECTIVE in
letterspaced Cormorant Garamond Bold caps beneath it, at near-full opacity, with a
soft shadow. It is ~22% of the image width and sits in the calmest corner that does
not touch the countertop (config.json -> logo_stamp; style "icon" = old stamp).

Formats: 1x1 1080x1080 (grid), 4x5 1080x1350 (feed), 9x16 1080x1920 (Story/Reel).
Generate the scene at 9:16 so every format is a crop (never letterboxed or
stretched). Crops are centred on the countertop (focus_y = its vertical
position in the scene, 0 top .. 1 bottom).

Usage: python3 compose.py --scene scene.jpg --out-dir DIR [--focus-y 0.6]
"""
import argparse
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

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


def _hex(c):
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def _font(rel, size, weight):
    f = ImageFont.truetype(path(*rel.split("/")), size)
    try:
        f.set_variation_by_axes([weight])
    except Exception:
        pass
    return f


def _spaced(draw, cx, y, text, font, tracking, fill):
    """Draw letterspaced text centred on cx; tracking is extra px between letters."""
    widths = [draw.textlength(ch, font=font) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x = cx - total / 2
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=font, fill=fill)
        x += w + tracking
    return total


def build_seal(D, cfg, brand):
    """Circular seal (matches brand/profile-wordmark-1080.png: navy disc, thin gold ring,
    gold chevron + towers icon, name beneath). Rendered at 4x and downsampled.
    Returns an RGBA image of size (D, D) without shadow."""
    S = 4
    d = D * S
    navy, gold = _hex(brand["navy"]), _hex(brand["gold"])
    text_rgb = _hex(cfg.get("text_color", brand["gold"]))
    fg = int(255 * cfg.get("fg_opacity", 0.97))
    seal = Image.new("RGBA", (d, d), (0, 0, 0, 0))
    dr = ImageDraw.Draw(seal)
    # semi-translucent navy disc
    dr.ellipse((0, 0, d - 1, d - 1), fill=navy + (int(255 * cfg.get("disc_opacity", 0.66)),))
    # thin gold ring(s)
    rw = max(2 * S, round(d * cfg.get("ring_width", 0.012)))
    inset = round(d * 0.035)
    dr.ellipse((inset, inset, d - 1 - inset, d - 1 - inset), outline=gold + (fg,), width=rw)
    # icon
    with Image.open(path("brand", "logo-icon.png")) as im:
        icon = im.convert("RGBA")
    ih = round(d * cfg.get("icon_height", 0.36))
    iw = round(ih * icon.width / icon.height)
    icon = icon.resize((iw, ih), Image.LANCZOS)
    icon.putalpha(icon.getchannel("A").point(lambda v: v * fg // 255))
    iy = round(d * cfg.get("icon_top", 0.15))
    seal.alpha_composite(icon, ((d - iw) // 2, iy))
    # name beneath: URBAN STONE (Cormorant Garamond Bold caps, letterspaced) + COLLECTIVE
    name1, name2 = cfg.get("name_lines", ["URBAN STONE", "COLLECTIVE"])
    f1 = _font(cfg.get("font", "fonts/CormorantGaramond-VF.ttf"), round(d * cfg.get("name_size", 0.105)),
               cfg.get("font_weight", 700))
    f2 = _font(cfg.get("font", "fonts/CormorantGaramond-VF.ttf"), round(d * cfg.get("sub_size", 0.074)),
               cfg.get("font_weight", 700))
    tdr = ImageDraw.Draw(seal)
    # fit both lines inside the ring (max_text_width of the diameter)
    maxw = d * cfg.get("max_text_width", 0.66)

    def width(text, font, track):
        return sum(tdr.textlength(ch, font=font) for ch in text) + track * (len(text) - 1)

    while width(name1, f1, d * 0.010) > maxw:
        f1 = _font(cfg.get("font", "fonts/CormorantGaramond-VF.ttf"), f1.size - S, cfg.get("font_weight", 700))
    while width(name2, f2, d * 0.018) > maxw * 0.72:
        f2 = _font(cfg.get("font", "fonts/CormorantGaramond-VF.ttf"), f2.size - S, cfg.get("font_weight", 700))
    y1 = round(d * cfg.get("name_top", 0.565))
    w1 = _spaced(tdr, d / 2, y1, name1, f1, d * 0.010, text_rgb + (fg,))
    a1 = f1.getbbox("U")[3]
    rule_y = y1 + a1 + round(d * 0.028)
    y2 = rule_y + round(d * 0.022)
    w2 = _spaced(tdr, d / 2, y2, name2, f2, d * 0.018, text_rgb + (fg,))
    # hairline rule between the lines
    half = min(w1, w2) * 0.22
    tdr.line((d / 2 - half, rule_y, d / 2 + half, rule_y), fill=gold + (int(fg * 0.8),), width=max(S, rw // 2))
    return seal.resize((D, D), Image.LANCZOS)


def stamp(img, box, cfg, brand=None):
    x, y, x1, y1 = box
    base = img.convert("RGBA")
    if cfg.get("style", "seal") == "seal":
        mark = build_seal(x1 - x, cfg, brand or config()["brand"])
    else:  # legacy icon-only stamp
        with Image.open(path("brand", "logo-icon.png")) as im:
            mark = im.convert("RGBA").resize((x1 - x, y1 - y), Image.LANCZOS)
        mark.putalpha(mark.getchannel("A").point(lambda v: int(v * cfg["opacity"])))
    if cfg.get("shadow", True):
        pad = 30
        sh = Image.new("RGBA", (mark.width + 2 * pad, mark.height + 2 * pad), (0, 0, 0, 0))
        mask = mark.getchannel("A").point(lambda v: int(v * cfg.get("shadow_opacity", 0.45)))
        sh.paste((4, 7, 14, 255), (pad, pad), mask)
        sh = sh.filter(ImageFilter.GaussianBlur(cfg.get("shadow_blur", 10)))
        base.alpha_composite(sh, (x - pad + 2, y - pad + 5))
    base.alpha_composite(mark, (x, y))
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
        sw = round(W * cfg["logo_stamp"]["width_frac"])
        if cfg["logo_stamp"].get("style", "seal") == "seal":
            sh = sw  # circular seal
        else:
            with Image.open(path("brand", "logo-icon.png")) as icon:
                sh = round(sw * icon.height / icon.width)
        corner, box, scores = pick_corner(img, (sw, sh), f["margin"], counter_y, cfg["logo_stamp"])
        img = stamp(img, box, cfg["logo_stamp"], cfg["brand"])
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
