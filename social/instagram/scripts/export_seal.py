#!/usr/bin/env python3
"""Export the company seal (same code/config as the post stamp) for profile pictures.

For profile use the disc is fully opaque (not the 70% post-stamp disc) and the seal is
centred at `--fill` (default 88%) of the canvas so it survives circular profile crops
(Instagram / TikTok / Facebook).

Writes, for each size (first size gets no suffix):
  <name>.png / <name>-<size>.png              transparent background
  <name>-solid.png / <name>-solid-<size>.png  solid navy square, fully opaque (RGB)

Usage: python3 export_seal.py --out DIR [--sizes 1080 512] [--fill 0.88] [--name urban-stone-seal]
"""
import argparse
import os

from PIL import Image

from common import config
from compose import _hex, build_seal


def export(out_dir, sizes=(1080, 512), fill=0.88, name="urban-stone-seal"):
    cfg = config()
    seal_cfg = dict(cfg["logo_stamp"], disc_opacity=1.0, fg_opacity=1.0)
    os.makedirs(out_dir, exist_ok=True)
    written = []
    for i, size in enumerate(sizes):
        d = round(size * fill)
        seal = build_seal(d, seal_cfg, cfg["brand"])
        off = ((size - d) // 2, (size - d) // 2)
        clear = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        clear.alpha_composite(seal, off)
        solid = Image.new("RGBA", (size, size), _hex(cfg["brand"]["navy"]) + (255,))
        solid.alpha_composite(seal, off)
        solid = solid.convert("RGB")  # no alpha channel at all
        sfx = "" if i == 0 else f"-{size}"
        for img, fname in ((clear, f"{name}{sfx}.png"), (solid, f"{name}-solid{sfx}.png")):
            p = os.path.join(out_dir, fname)
            img.save(p, "PNG", optimize=True)
            written.append(p)
    return written


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--sizes", type=int, nargs="+", default=[1080, 512])
    ap.add_argument("--fill", type=float, default=0.88)
    ap.add_argument("--name", default="urban-stone-seal")
    a = ap.parse_args()
    for p in export(a.out, a.sizes, a.fill, a.name):
        print(p)
